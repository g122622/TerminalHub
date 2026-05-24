/**
 * TerminalHub 配置类型定义
 * 所有配置项必须从配置文件读取，禁止默认值
 */

export interface DaemonConfig {
    /** Unix socket 或 Named Pipe 路径 */
    socketPath: string;
    /** 日志级别: debug | info | warn | error */
    logLevel: "debug" | "info" | "warn" | "error";
}

export interface SessionConfig {
    /** 输出缓冲区最大行数 */
    outputBufferLines: number;
    /** 会话标题最大长度 */
    titleMaxLength: number;
    /** 默认 shell: cmd | powershell | bash */
    defaultShell: "cmd" | "powershell" | "bash";
}

export interface TerminalConfig {
    /** 终端默认列数 */
    cols: number;
    /** 终端默认行数 */
    rows: number;
}

export interface Config {
    version: string;
    daemon: DaemonConfig;
    session: SessionConfig;
    terminal: TerminalConfig;
}

/**
 * 配置必填字段路径
 */
export const REQUIRED_CONFIG_PATHS: readonly string[] = [
    "daemon.socketPath",
    "daemon.logLevel",
    "session.outputBufferLines",
    "session.titleMaxLength",
    "session.defaultShell",
    "terminal.cols",
    "terminal.rows"
] as const;
