import "reflect-metadata";
import { container } from "tsyringe";

import { ConfigManager, DAEMON_PID_PATH } from "../storage/index.js";
import { IPCServer } from "../ipc/index.js";
import { SessionManager } from "../session/index.js";
import { writePidFile } from "../utils/pid.js";
import { createLogger, Logger } from "../utils/logger.js";
import type { SessionListItem } from "../types/index.js";
import type { NewSessionPayload, AttachSessionPayload, InputPayload, ResizePayload, RenamePayload, KillPayload } from "../types/ipc.js";
import net from "node:net";

/**
 * Daemon 进程入口
 */
async function main(): Promise<void> {
    // 加载配置
    const configManager = new ConfigManager();
    const config = configManager.load();

    // 初始化日志
    const logger = createLogger({
        level: config.daemon.logLevel,
        prefix: "Daemon"
    });

    logger.info("TerminalHub Daemon 启动中...");

    // 写入 PID 文件
    writePidFile(DAEMON_PID_PATH, process.pid);
    logger.info(`PID: ${process.pid}`);

    // 注册依赖注入
    container.registerInstance(ConfigManager, configManager);
    container.registerInstance(Logger, logger);

    // 初始化会话管理器
    const sessionManager = container.resolve(SessionManager);
    await sessionManager.initialize();

    // 启动 IPC 服务端
    const ipcServer = new IPCServer(config.daemon.socketPath);

    // 注册命令处理器
    ipcServer.onCommand("list", async () => {
        return sessionManager.listSessions() as SessionListItem[];
    });

    ipcServer.onCommand<NewSessionPayload, { sessionId: string; title: string }>("new", async (payload) => {
        const options: { title?: string; cwd?: string; shell?: string; cols?: number; rows?: number } = {};
        if (payload.title !== undefined) options.title = payload.title;
        if (payload.cwd !== undefined) options.cwd = payload.cwd;
        if (payload.shell !== undefined) options.shell = payload.shell;
        if (payload.cols !== undefined) options.cols = payload.cols;
        if (payload.rows !== undefined) options.rows = payload.rows;

        const session = await sessionManager.createSession(options);
        return { sessionId: session.metadata.id, title: session.metadata.title };
    });

    ipcServer.onCommand<KillPayload, boolean>("kill", async (payload) => {
        return sessionManager.killSession(payload.sessionId);
    });

    ipcServer.onCommand<RenamePayload, boolean>("rename", async (payload) => {
        return sessionManager.renameSession(payload.sessionId, payload.newTitle);
    });

    ipcServer.onCommand<AttachSessionPayload, { history: string[] }>("attach", async (payload, client) => {
        const session = sessionManager.getSession(payload.sessionId);
        if (!session) {
            throw new Error(`会话不存在: ${payload.sessionId}`);
        }

        session.addClient(client);
        session.touch();

        // 发送历史输出
        const history = session.outputBuffer.getRecentLines();
        return { history };
    });

    ipcServer.onCommand<InputPayload, void>("input", async (payload) => {
        const session = sessionManager.getSession(payload.sessionId);
        if (!session || !session.ptyProcess) {
            throw new Error(`会话不存在或已结束: ${payload.sessionId}`);
        }

        session.ptyProcess.write(payload.data);
        session.touch();
    });

    ipcServer.onCommand<ResizePayload, void>("resize", async (payload) => {
        const session = sessionManager.getSession(payload.sessionId);
        if (!session || !session.ptyProcess) {
            throw new Error(`会话不存在或已结束: ${payload.sessionId}`);
        }

        session.ptyProcess.resize(payload.cols, payload.rows);
    });

    // 处理客户端断开
    ipcServer.on("client-disconnect", (client: net.Socket) => {
        // 从所有会话中移除该客户端
        // TODO: 需要在 SessionManager 中添加方法
    });

    // 处理进程信号
    process.on("SIGTERM", async () => {
        logger.info("收到 SIGTERM 信号，正在关闭...");
        await ipcServer.stop();
        process.exit(0);
    });

    process.on("SIGINT", async () => {
        logger.info("收到 SIGINT 信号，正在关闭...");
        await ipcServer.stop();
        process.exit(0);
    });

    // 启动服务
    try {
        await ipcServer.start();
        logger.info(`IPC 服务端已启动: ${config.daemon.socketPath}`);

        // 保持进程运行
        process.stdin.resume();
    } catch (error) {
        logger.error("启动失败", error as Error);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error("Daemon 启动失败:", error);
    process.exit(1);
});
