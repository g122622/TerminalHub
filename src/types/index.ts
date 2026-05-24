export * from "./config.js";
export * from "./ipc.js";

/**
 * 会话元数据
 */
export interface SessionMetadata {
    /** 唯一 ID: th_{timestamp}_{random} */
    id: string;
    /** 会话标题 (智能识别或用户定义) */
    title: string;
    /** shell 类型 */
    shell: string;
    /** 工作目录 */
    cwd: string;
    /** PTY 进程 PID */
    pid: number;
    /** 创建时间戳 */
    createdAt: number;
    /** 最后活动时间 */
    lastActivityAt: number;
    /** 当前连接客户端数 */
    connectedClients: number;
}

/**
 * 会话列表项 (用于 th list 显示)
 */
export interface SessionListItem {
    id: string;
    title: string;
    shell: string;
    pid: number;
    createdAt: number;
    lastActivityAt: number;
    connectedClients: number;
    /** 是否存活 */
    alive: boolean;
}
