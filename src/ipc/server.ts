import net from "node:net";
import { EventEmitter } from "node:events";

import type { IPCMessage, IPCRequest, IPCResponse, IPCEvent, CommandType } from "../types/ipc.js";

/**
 * 命令处理器类型
 */
export type CommandHandler<T = unknown, R = unknown> = (
    payload: T,
    client: net.Socket
) => Promise<R> | R;

/**
 * IPC 服务端
 * 运行在 Daemon 进程中，处理 CLI 客户端请求
 */
export class IPCServer extends EventEmitter {
    private socketPath: string;
    private server: net.Server | null = null;
    private clients: Set<net.Socket> = new Set();
    private commandHandlers: Map<CommandType, CommandHandler> = new Map();
    private buffer: Map<net.Socket, string> = new Map();

    constructor(socketPath: string) {
        super();
        this.socketPath = socketPath;
    }

    /**
     * 注册命令处理器
     */
    onCommand<T = unknown, R = unknown>(command: CommandType, handler: CommandHandler<T, R>): void {
        this.commandHandlers.set(command, handler as CommandHandler);
    }

    /**
     * 启动服务端
     */
    async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            const server = net.createServer((socket) => {
                this.handleConnection(socket);
            });

            server.on("error", reject);

            // Windows Named Pipe 格式
            const address = process.platform === "win32" && !this.socketPath.includes("\\\\")
                ? `\\\\.\\pipe\\${this.socketPath}`
                : this.socketPath;

            server.listen(address, () => {
                this.server = server;
                resolve();
            });
        });
    }

    /**
     * 处理新连接
     */
    private handleConnection(socket: net.Socket): void {
        this.clients.add(socket);
        this.buffer.set(socket, "");

        socket.on("data", (data) => {
            this.handleData(socket, data.toString());
        });

        socket.on("close", () => {
            this.clients.delete(socket);
            this.buffer.delete(socket);
            this.emit("client-disconnect", socket);
        });

        socket.on("error", (err) => {
            this.emit("error", err);
        });

        this.emit("client-connect", socket);
    }

    /**
     * 处理接收到的数据
     */
    private async handleData(socket: net.Socket, data: string): Promise<void> {
        const currentBuffer = this.buffer.get(socket) || "";
        const newBuffer = currentBuffer + data;
        const lines = newBuffer.split("\n");
        this.buffer.set(socket, lines.pop() || "");

        for (const line of lines) {
            if (!line.trim()) continue;

            try {
                const message = JSON.parse(line) as IPCRequest;
                await this.handleRequest(socket, message);
            } catch (err) {
                this.emit("error", err);
            }
        }
    }

    /**
     * 处理请求
     */
    private async handleRequest(socket: net.Socket, request: IPCRequest): Promise<void> {
        const handler = this.commandHandlers.get(request.command);

        let response: IPCResponse;

        if (!handler) {
            response = {
                type: "response",
                id: request.id,
                success: false,
                error: `未知命令: ${request.command}`
            };
        } else {
            try {
                const result = await handler(request.payload, socket);
                response = {
                    type: "response",
                    id: request.id,
                    success: true,
                    data: result
                };
            } catch (err) {
                response = {
                    type: "response",
                    id: request.id,
                    success: false,
                    error: (err as Error).message
                };
            }
        }

        const data = JSON.stringify(response) + "\n";
        socket.write(data);
    }

    /**
     * 向所有客户端广播事件
     */
    broadcast<T = unknown>(eventType: IPCEvent["eventType"], eventData: T, sessionId?: string): void {
        const event: IPCEvent = {
            type: "event",
            eventType,
            sessionId: sessionId,
            data: eventData
        };

        const jsonData = JSON.stringify(event) + "\n";
        for (const client of this.clients) {
            client.write(jsonData);
        }
    }

    /**
     * 向特定客户端发送事件
     */
    sendToClient<T = unknown>(socket: net.Socket, eventType: IPCEvent["eventType"], eventData: T, sessionId?: string): void {
        const event: IPCEvent = {
            type: "event",
            eventType,
            sessionId: sessionId,
            data: eventData
        };

        const jsonData = JSON.stringify(event) + "\n";
        socket.write(jsonData);
    }

    /**
     * 停止服务端
     */
    async stop(): Promise<void> {
        for (const client of this.clients) {
            client.end();
        }
        this.clients.clear();

        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    this.server = null;
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    /**
     * 获取连接的客户端数量
     */
    getClientCount(): number {
        return this.clients.size;
    }
}
