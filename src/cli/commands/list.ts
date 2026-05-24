import { ConfigManager } from "../../storage/index.js";
import { DaemonLifecycle } from "../../daemon/index.js";
import { IPCClient } from "../../ipc/index.js";
import { output } from "../utils/output.js";

/**
 * th list 命令
 * 列出所有活跃会话
 */
export async function listCommand(): Promise<void> {
    const configManager = new ConfigManager();
    const config = configManager.load();

    // 确保 Daemon 运行
    const daemonLifecycle = new DaemonLifecycle(configManager);
    await daemonLifecycle.ensureRunning();

    // 连接到 Daemon
    const client = new IPCClient(config.daemon.socketPath);
    try {
        await client.connect();

        // 发送 list 命令
        const sessions = await client.request<{ id: string; title: string; shell: string; pid: number; createdAt: number; lastActivityAt: number; connectedClients: number; alive: boolean }[]>("list", {});

        if (sessions.length === 0) {
            output.info("没有活跃的会话");
            return;
        }

        output.title("活跃会话列表");
        for (const session of sessions) {
            const status = session.alive ? output.success : output.warn;
            status(`[${session.id}] ${session.title}`);
            console.log(`    Shell: ${session.shell} | PID: ${session.pid} | 客户端: ${session.connectedClients}`);
            console.log(`    创建时间: ${new Date(session.createdAt).toLocaleString()}`);
            console.log(`    最后活动: ${new Date(session.lastActivityAt).toLocaleString()}`);
            console.log("");
        }
    } finally {
        client.disconnect();
    }
}
