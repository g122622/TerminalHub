import os from "node:os";

import { ConfigManager } from "../../storage/index.js";
import { DaemonLifecycle } from "../../daemon/index.js";
import { IPCClient } from "../../ipc/index.js";
import { output } from "../utils/output.js";

/**
 * th new 命令
 * 创建新的终端会话
 */
export async function newCommand(title?: string): Promise<void> {
    const configManager = new ConfigManager();
    const config = configManager.load();

    // 确保 Daemon 运行
    const daemonLifecycle = new DaemonLifecycle(configManager);
    await daemonLifecycle.ensureRunning();

    // 连接到 Daemon
    const client = new IPCClient(config.daemon.socketPath);
    try {
        await client.connect();

        // 发送 new 命令
        const result = await client.request<{ sessionId: string; title: string }>("new", {
            title,
            cwd: process.cwd(),
            cols: process.stdout.columns ?? config.terminal.cols,
            rows: process.stdout.rows ?? config.terminal.rows
        });

        output.success(`创建会话成功: ${result.sessionId}`);
        output.info(`标题: ${result.title}`);
        output.info(`使用 'th attach ${result.sessionId}' 连接到此会话`);
    } finally {
        client.disconnect();
    }
}
