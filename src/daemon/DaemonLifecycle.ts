import childProcess from "node:child_process";
import path from "node:path";

import { ConfigManager, DAEMON_PID_PATH } from "../storage/index.js";
import { isDaemonRunning } from "../ipc/client.js";
import { readPidFile, writePidFile, removePidFile, isProcessAlive } from "../utils/pid.js";

// 兼容 ESM 和 CJS/pkg 环境
const scriptDir = typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(process.argv[1] || process.cwd());

/**
 * Daemon 生命周期管理
 */
export class DaemonLifecycle {
    private configManager: ConfigManager;

    constructor(configManager: ConfigManager) {
        this.configManager = configManager;
    }

    /**
     * 确保 Daemon 正在运行
     * 如果未运行则自动启动
     */
    async ensureRunning(): Promise<void> {
        const config = this.configManager.get();

        // 检查 PID 文件
        const pid = readPidFile(DAEMON_PID_PATH);
        if (pid !== null && isProcessAlive(pid)) {
            // 检查 socket 是否可连接
            if (await isDaemonRunning(config.daemon.socketPath)) {
                return; // Daemon 已在运行
            }
        }

        // Daemon 未运行，启动新的
        await this.start();
    }

    /**
     * 启动 Daemon 进程
     */
    async start(): Promise<void> {
        const daemonScript = path.join(scriptDir, "main.js");

        // 使用 detached 模式启动，使子进程成为孤儿进程
        const child = childProcess.spawn(process.execPath, [daemonScript], {
            detached: true,
            stdio: "ignore",
            env: {
                ...process.env,
                TERMINALHUB_DAEMON: "1"
            }
        });

        // 子进程 PID
        const pid = child.pid;
        if (!pid) {
            throw new Error("无法启动 Daemon 进程");
        }

        // 写入 PID 文件
        writePidFile(DAEMON_PID_PATH, pid);

        // 分离子进程
        child.unref();

        // 等待 Daemon 就绪
        await this.waitForReady();
    }

    /**
     * 等待 Daemon 就绪
     */
    private async waitForReady(maxAttempts = 10, delayMs = 500): Promise<void> {
        const config = this.configManager.get();

        for (let i = 0; i < maxAttempts; i++) {
            if (await isDaemonRunning(config.daemon.socketPath)) {
                return;
            }
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }

        throw new Error("Daemon 启动超时");
    }

    /**
     * 停止 Daemon 进程
     */
    async stop(): Promise<void> {
        const pid = readPidFile(DAEMON_PID_PATH);
        if (pid === null) {
            return;
        }

        // 发送 SIGTERM
        try {
            process.kill(pid, "SIGTERM");
        } catch {
            // 进程可能已不存在
        }

        // 清理 PID 文件
        removePidFile(DAEMON_PID_PATH);
    }

    /**
     * 检查当前进程是否为 Daemon
     */
    static isDaemonProcess(): boolean {
        return process.env["TERMINALHUB_DAEMON"] === "1";
    }
}
