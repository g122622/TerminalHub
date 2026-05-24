import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { ConfigManager } from "../../storage/index.js";
import { DaemonLifecycle } from "../../daemon/index.js";
import { IPCClient } from "../../ipc/index.js";
import { output as cliOutput } from "../utils/output.js";
import type { IPCEvent } from "../../types/ipc.js";

/**
 * th attach 命令
 * 连接到现有会话
 */
export async function attachCommand(sessionId: string): Promise<void> {
    const configManager = new ConfigManager();
    const config = configManager.load();

    // 确保 Daemon 运行
    const daemonLifecycle = new DaemonLifecycle(configManager);
    await daemonLifecycle.ensureRunning();

    // 连接到 Daemon
    const client = new IPCClient(config.daemon.socketPath);

    // 设置原始模式
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
    }
    process.stdin.resume();

    // 退出处理
    let exiting = false;
    const cleanup = async () => {
        if (exiting) return;
        exiting = true;

        if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
        }
        process.stdin.pause();

        client.disconnect();
        cliOutput.info("\n已断开会话连接");
        process.exit(0);
    };

    // Ctrl+D 或 Ctrl+C 退出
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);

    try {
        await client.connect();

        // 发送 attach 命令
        const result = await client.request<{ history: string[] }>("attach", {
            sessionId,
            cols: process.stdout.columns ?? config.terminal.cols,
            rows: process.stdout.rows ?? config.terminal.rows
        });

        // 显示历史输出
        if (result.history.length > 0) {
            process.stdout.write("\x1b[2J\x1b[H"); // 清屏
            process.stdout.write(result.history.join("\n"));
        }

        cliOutput.info(`已连接到会话 ${sessionId}，按 Ctrl+D 退出`);

        // 监听事件
        client.on("event", (event: IPCEvent) => {
            if (event.eventType === "output" && event.sessionId === sessionId) {
                process.stdout.write(event.data as string);
            } else if (event.eventType === "exit" && event.sessionId === sessionId) {
                cliOutput.info("\n会话已结束");
                cleanup();
            }
        });

        // 监听用户输入
        process.stdin.on("data", async (data) => {
            const str = data.toString();

            // Ctrl+D 退出
            if (str === "\x04") {
                await cleanup();
                return;
            }

            // 发送输入
            try {
                await client.request("input", { sessionId, data: str });
            } catch {
                await cleanup();
            }
        });

        // 监听终端大小变化
        process.stdout.on("resize", async () => {
            try {
                await client.request("resize", {
                    sessionId,
                    cols: process.stdout.columns ?? config.terminal.cols,
                    rows: process.stdout.rows ?? config.terminal.rows
                });
            } catch {
                // 忽略错误
            }
        });

        // 保持运行
        await new Promise<void>(() => {});
    } catch (error) {
        cliOutput.error(`连接失败: ${(error as Error).message}`);
        await cleanup();
    }
}
