# TerminalHub

TerminalHub 是一个终端会话管理器，实现会话与终端连接的解耦，支持多客户端实时同步。

## 功能特性

- **会话持久化** - SSH 断开后会话保持运行，重新连接可恢复
- **多客户端同步** - 多个终端可同时连接同一会话，实时同步输出
- **自动 Daemon 管理** - CLI 命令自动检测并启动后台服务
- **输出历史缓冲** - 连接时显示上下文历史

## 安装

```bash
# 克隆仓库
git clone <repo-url>
cd TerminalHub

# 安装依赖
npm install

# 构建
npm run build

# 全局安装 (可选)
npm link
```

## 快速开始

```bash
# 1. 初始化配置文件
th init

# 2. 创建新会话
th new "my-project"

# 3. 查看所有会话
th list

# 4. 连接到会话
th attach th_1779634305113_xxx

# 5. 终止会话
th kill th_1779634305113_xxx
```

## 命令说明

### `th init`

初始化 TerminalHub 配置文件，生成 `~/.terminalhub/` 目录结构。

```bash
th init
```

### `th new [title]`

创建新的终端会话并立即进入 attach 模式。

```bash
th new                    # 使用默认标题
th new "project-name"     # 指定标题
```

### `th list`

列出所有活跃会话及其状态。

```bash
th list
```

输出示例：
```
活跃会话列表

✓ [th_1779634305113_cf926800] my-project
    Shell: powershell.exe | PID: 1254576 | 客户端: 0
    创建时间: 2026/5/24 22:51:45
    最后活动: 2026/5/24 22:51:45
```

### `th attach <session-id>`

连接到现有会话。连接后会显示历史输出缓冲区内容。

```bash
th attach th_1779634305113_xxx
```

连接后：
- 按 `Ctrl+D` 退出会话（会话继续运行）
- 输入内容会实时发送到 PTY

### `th kill <session-id>`

终止指定会话。

```bash
th kill th_1779634305113_xxx
```

### `th rename <session-id> <new-title>`

重命名会话标题。

```bash
th rename th_1779634305113_xxx "new-title"
```

## 配置

配置文件位于 `~/.terminalhub/config.json`：

```json
{
  "version": "1.0.0",
  "daemon": {
    "socketPath": "~/.terminalhub/daemon.sock",
    "logLevel": "info"
  },
  "session": {
    "outputBufferLines": 1000,
    "titleMaxLength": 50,
    "defaultShell": "powershell"
  },
  "terminal": {
    "cols": 80,
    "rows": 24
  }
}
```

### 配置项说明

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `daemon.socketPath` | IPC 通信路径 | `~/.terminalhub/daemon.sock` |
| `daemon.logLevel` | 日志级别 | `info` |
| `session.outputBufferLines` | 输出历史缓冲行数 | `1000` |
| `session.titleMaxLength` | 会话标题最大长度 | `50` |
| `session.defaultShell` | 默认 Shell | `powershell` |
| `terminal.cols` | 终端默认列数 | `80` |
| `terminal.rows` | 终端默认行数 | `24` |

**重要**：配置文件必须存在，缺失配置项会导致错误。

## 目录结构

```
~/.terminalhub/
├── config.json        # 配置文件
├── sessions.json      # 会话元数据
├── daemon.pid         # Daemon 进程 PID
└── logs/              # 日志目录
    └── daemon.log
```

## 架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户终端 (th list/th new)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     TerminalHub CLI (yargs)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Daemon 进程 (自动启动)                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  SessionManager                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  PTY Manager (node-pty)                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  IPC Server (Named Pipe)                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   持久化存储 (~/.terminalhub/)                    │
└─────────────────────────────────────────────────────────────────┘
```

## 使用场景

### 场景 1：远程开发

```bash
# 在 Windows 台式机上
th new "remote-dev"

# 从 MacBook SSH 连接
ssh user@windows-pc
th list
th attach th_xxx

# SSH 断开，会话继续运行
# 再次 SSH 连接，恢复工作
```

### 场景 2：多终端同步

```bash
# 终端 1
th attach th_xxx

# 终端 2 (同一会话)
th attach th_xxx

# 两个终端看到相同的实时输出
```

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 开发模式 (监听变化)
npm run dev

# 代码检查
npm run lint

# 格式化
npm run format

# 测试
npm test
```

## 技术栈

- **TypeScript** - 类型安全
- **node-pty** - PTY 进程管理 (Windows ConPTY)
- **yargs** - CLI 框架
- **@inquirer/prompts** - 交互式选择
- **tsyringe** - 依赖注入

## 系统要求

- Node.js >= 16
- Windows 10 1809+ (ConPTY 支持)
- PowerShell / cmd / bash

## License

MIT
