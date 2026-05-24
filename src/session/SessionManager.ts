import "reflect-metadata";
import { injectable, inject } from "tsyringe";

import { ConfigManager } from "../storage/index.js";
import { Session, PtyProcess } from "../session/Session.js";
import { OutputBuffer } from "../session/OutputBuffer.js";
import { SessionRegistry } from "../session/SessionRegistry.js";
import { createPtyProcess, getDefaultShell } from "../pty/PtyProcess.js";
import { generateSessionId } from "../utils/id.js";
import { Logger } from "../utils/logger.js";

/**
 * 创建会话选项
 */
export interface CreateSessionOptions {
    title?: string;
    cwd?: string;
    shell?: string;
    cols?: number;
    rows?: number;
}

/**
 * 会话管理器
 */
@injectable()
export class SessionManager {
    private registry: SessionRegistry;
    private sessions: Map<string, Session> = new Map();
    private logger: Logger;
    private configManager: ConfigManager;

    constructor(
        @inject(ConfigManager) configManager: ConfigManager,
        @inject(Logger) logger: Logger
    ) {
        this.configManager = configManager;
        this.registry = new SessionRegistry();
        this.logger = logger;
    }

    /**
     * 初始化：加载持久化的会话
     */
    async initialize(): Promise<void> {
        // 清理无效会话
        const removed = this.registry.cleanup();
        if (removed.length > 0) {
            this.logger.info(`清理了 ${removed.length} 个无效会话`);
        }

        // 加载存活会话（TODO: 重新连接到存活的 PTY 进程）
    }

    /**
     * 创建新会话
     */
    async createSession(options: CreateSessionOptions): Promise<Session> {
        const config = this.configManager.get();
        const id = generateSessionId();
        const shell = options.shell ?? getDefaultShell(config.session.defaultShell);
        const cols = options.cols ?? config.terminal.cols;
        const rows = options.rows ?? config.terminal.rows;

        // 创建 PTY 进程
        const ptyOptions: { shell: string; cwd?: string; env?: Record<string, string>; cols: number; rows: number } = {
            shell,
            cols,
            rows
        };
        if (options.cwd) {
            ptyOptions.cwd = options.cwd;
        }
        const ptyProcess = createPtyProcess(ptyOptions);

        // 创建输出缓冲区
        const outputBuffer = new OutputBuffer(config.session.outputBufferLines);

        // 创建会话元数据
        const metadata = {
            id,
            title: options.title ?? `Session ${id}`,
            shell,
            cwd: options.cwd ?? process.cwd(),
            pid: ptyProcess.pid,
            createdAt: Date.now(),
            lastActivityAt: Date.now(),
            connectedClients: 0
        };

        // 创建会话
        const session = new Session(metadata, outputBuffer);
        session.ptyProcess = ptyProcess;

        // 监听输出
        ptyProcess.onData((data) => {
            outputBuffer.write(data);
            // 广播给所有客户端
            session.broadcastOutput(data);
        });

        // 监听退出
        ptyProcess.onExit((code, signal) => {
            this.logger.info(`会话 ${id} 退出: code=${code}, signal=${signal}`);
            session.broadcastExit(code, signal);
            this.handleSessionExit(id);
        });

        // 保存会话
        this.sessions.set(id, session);
        this.registry.save(metadata);

        this.logger.info(`创建会话: ${id} (PID: ${ptyProcess.pid})`);

        return session;
    }

    /**
     * 获取会话
     */
    getSession(sessionId: string): Session | null {
        return this.sessions.get(sessionId) || null;
    }

    /**
     * 列出所有会话
     */
    listSessions() {
        return this.registry.list();
    }

    /**
     * 终止会话
     */
    async killSession(sessionId: string): Promise<boolean> {
        const session = this.sessions.get(sessionId);
        if (!session || !session.ptyProcess) {
            return false;
        }

        // Windows 不支持信号，直接 kill
        session.ptyProcess.kill();
        this.sessions.delete(sessionId);
        this.registry.delete(sessionId);

        this.logger.info(`终止会话: ${sessionId}`);
        return true;
    }

    /**
     * 重命名会话
     */
    renameSession(sessionId: string, newTitle: string): boolean {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return false;
        }

        session.metadata.title = newTitle;
        this.registry.save(session.metadata);

        this.logger.info(`重命名会话: ${sessionId} -> ${newTitle}`);
        return true;
    }

    /**
     * 处理会话退出
     */
    private handleSessionExit(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.ptyProcess = null;
            this.registry.delete(sessionId);
        }
    }
}
