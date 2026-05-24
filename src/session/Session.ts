import type { SessionMetadata } from "../types/index.js";
import type { OutputBuffer } from "./OutputBuffer.js";
import { EventEmitter } from "node:events";

/**
 * PTY 进程封装接口
 */
export interface PtyProcess {
    pid: number;
    write(data: string): void;
    resize(cols: number, rows: number): void;
    kill(signal?: string): void;
    onData(callback: (data: string) => void): void;
    onExit(callback: (code: number, signal?: number) => void): void;
}

/**
 * 会话实体
 */
export class Session extends EventEmitter {
    metadata: SessionMetadata;
    outputBuffer: OutputBuffer;
    ptyProcess: PtyProcess | null = null;
    clients: Set<unknown> = new Set();

    constructor(metadata: SessionMetadata, outputBuffer: OutputBuffer) {
        super();
        this.metadata = metadata;
        this.outputBuffer = outputBuffer;
    }

    /**
     * 添加客户端
     */
    addClient(client: unknown): void {
        this.clients.add(client);
        this.metadata.connectedClients = this.clients.size;
    }

    /**
     * 移除客户端
     */
    removeClient(client: unknown): void {
        this.clients.delete(client);
        this.metadata.connectedClients = this.clients.size;
    }

    /**
     * 更新最后活动时间
     */
    touch(): void {
        this.metadata.lastActivityAt = Date.now();
    }

    /**
     * 检查是否存活
     */
    isAlive(): boolean {
        return this.ptyProcess !== null && this.ptyProcess.pid > 0;
    }

    /**
     * 广播输出给所有客户端
     */
    broadcastOutput(data: string): void {
        this.emit("output", data);
    }

    /**
     * 广播会话退出
     */
    broadcastExit(code: number, signal?: number): void {
        this.emit("exit", code, signal);
    }
}
