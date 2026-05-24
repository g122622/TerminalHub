import net from "node:net";
import { EventEmitter } from "node:events";

import type { IPCMessage, IPCRequest, IPCResponse, IPCEvent } from "../types/ipc.js";
import { generateRequestId } from "../utils/id.js";

/**
 * IPC 客户端
 * 用于 CLI 与 Daemon 进程通信
 */
export class IPCClient extends EventEmitter {
    private socketPath: string;
    private socket: net.Socket | null = null;
    private pendingRequests: Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }> = new Map();
    private buffer: string = "";

    constructor(socketPath: string) {
        super();
        this.socketPath = socketPath;
    }

    /**
     * 连接到 Daemon
     */
    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();

            socket.on("connect", () => {
                this.socket = socket;
                resolve();
            });

            socket.on("error", (err) => {
                reject(new Error(`无法连接到 Daemon: ${err.message}`));
            });

            socket.on("data", (data) => {
                this.handleData(data.toString());
            });

            socket.on("close", () => {
                this.socket = null;
                this.emit("close");
            });

            // Windows Named Pipe 格式: \\.\pipe\terminalhub
            const address = process.platform === "win32" && !this.socketPath.includes("\\\\")
                ? `\\\\.\\pipe\\${this.socketPath}`
                : this.socketPath;

            socket.connect(address);
        });
    }

    /**
     * 发送请求并等待响应
     */
    async request<T = unknown>(command: IPCRequest["command"], payload: unknown): Promise<T> {
        if (!this.socket) {
            throw new Error("未连接到 Daemon");
        }

        const id = generateRequestId();
        const message: IPCRequest = {
            type: "request",
            id,
            command,
            payload
        };

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve: resolve as (value: unknown) => void, reject });

            const data = JSON.stringify(message) + "\n";
            this.socket!.write(data, (err) => {
                if (err) {
                    this.pendingRequests.delete(id);
                    reject(err);
                }
            });
        });
    }

    /**
     * 处理接收到的数据
     */
    private handleData(data: string): void {
        this.buffer += data;

        const lines = this.buffer.split("\n");
        this.buffer = lines.pop() || "";

        for (const line of lines) {
            if (!line.trim()) continue;

            try {
                const message = JSON.parse(line) as IPCMessage;

                if (message.type === "response") {
                    const pending = this.pendingRequests.get(message.id);
                    if (pending) {
                        this.pendingRequests.delete(message.id);
                        if (message.success) {
                            pending.resolve(message.data);
                        } else {
                            pending.reject(new Error(message.error || "未知错误"));
                        }
                    }
                } else if (message.type === "event") {
                    this.emit("event", message);
                }
            } catch {
                // 忽略解析错误
            }
        }
    }

    /**
     * 断开连接
     */
    disconnect(): void {
        if (this.socket) {
            this.socket.end();
            this.socket = null;
        }
    }

    /**
     * 检查是否已连接
     */
    isConnected(): boolean {
        return this.socket !== null;
    }
}

/**
 * 检查 Daemon 是否运行
 */
export async function isDaemonRunning(socketPath: string): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = new net.Socket();

        const address = process.platform === "win32" && !socketPath.includes("\\\\")
            ? `\\\\.\\pipe\\${socketPath}`
            : socketPath;

        socket.connect(address, () => {
            socket.end();
            resolve(true);
        });

        socket.on("error", () => {
            resolve(false);
        });
    });
}
