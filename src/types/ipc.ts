/**
 * IPC 消息协议类型定义
 */

export type CommandType =
    | "list" // 列出会话
    | "new" // 创建会话
    | "attach" // 连接会话
    | "detach" // 断开连接
    | "kill" // 终止会话
    | "rename" // 重命名
    | "input" // 用户输入
    | "resize" // 终端尺寸变化
    | "shutdown"; // 关闭 daemon

export type EventType =
    | "output" // 会话输出
    | "exit" // 会话退出
    | "session_added" // 新会话创建
    | "session_removed" // 会话移除
    | "error"; // 错误

export interface IPCRequest<T = unknown> {
    type: "request";
    id: string;
    command: CommandType;
    payload: T;
}

export interface IPCResponse<T = unknown> {
    type: "response";
    id: string;
    success: boolean;
    data?: T;
    error?: string;
}

export interface IPCEvent<T = unknown> {
    type: "event";
    eventType: EventType;
    sessionId: string | undefined;
    data: T;
}

export type IPCMessage<T = unknown> = IPCRequest<T> | IPCResponse<T> | IPCEvent<T>;

// 具体命令的 payload 类型
export interface NewSessionPayload {
    title?: string;
    cwd?: string;
    shell?: string;
    cols?: number;
    rows?: number;
}

export interface AttachSessionPayload {
    sessionId: string;
    cols?: number;
    rows?: number;
}

export interface InputPayload {
    sessionId: string;
    data: string;
}

export interface ResizePayload {
    sessionId: string;
    cols: number;
    rows: number;
}

export interface RenamePayload {
    sessionId: string;
    newTitle: string;
}

export interface KillPayload {
    sessionId: string;
}
