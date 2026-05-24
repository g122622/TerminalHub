import { ConfigManager } from "../../storage/index.js";
import { DaemonLifecycle } from "../../daemon/index.js";
import { IPCClient } from "../../ipc/index.js";
import { output } from "../utils/output.js";

/**
 * th rename 命令
 * 重命名会话
 */
export async function renameCommand(sessionId: string, newTitle: string): Promise<void> {
    const configManager = new ConfigManager();
    const config = configManager.load();

    // 确保 Daemon 运行
    const daemonLifecycle = new DaemonLifecycle(configManager);
    await daemonLifecycle.ensureRunning();

    // 连接到 Daemon
    const client = new IPCClient(config.daemon.socketPath);
    try {
        await client.connect();

        // 发送 rename 命令
        const success = await client.request<boolean>("rename", { sessionId, newTitle });

        if (success) {
            output.success(`会话已重命名为: ${newTitle}`);
        } else {
            output.error(`会话 ${sessionId} 不存在`);
        }
    } finally {
        client.disconnect();
    }
}
