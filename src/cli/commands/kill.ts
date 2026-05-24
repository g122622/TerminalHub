import { ConfigManager } from "../../storage/index.js";
import { DaemonLifecycle } from "../../daemon/index.js";
import { IPCClient } from "../../ipc/index.js";
import { output } from "../utils/output.js";

/**
 * th kill 命令
 * 终止会话
 */
export async function killCommand(sessionId: string): Promise<void> {
    const configManager = new ConfigManager();
    const config = configManager.load();

    // 确保 Daemon 运行
    const daemonLifecycle = new DaemonLifecycle(configManager);
    await daemonLifecycle.ensureRunning();

    // 连接到 Daemon
    const client = new IPCClient(config.daemon.socketPath);
    try {
        await client.connect();

        // 发送 kill 命令
        const success = await client.request<boolean>("kill", { sessionId });

        if (success) {
            output.success(`会话 ${sessionId} 已终止`);
        } else {
            output.error(`会话 ${sessionId} 不存在或已结束`);
        }
    } finally {
        client.disconnect();
    }
}
