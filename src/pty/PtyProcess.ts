import * as pty from "node-pty";

import type { PtyProcess } from "../session/Session.js";

/**
 * PTY 进程选项
 */
export interface PtyOptions {
    shell: string;
    cwd?: string;
    env?: Record<string, string>;
    cols?: number;
    rows?: number;
}

/**
 * 创建 PTY 进程
 */
export function createPtyProcess(options: PtyOptions): PtyProcess {
    const { shell, cwd, env, cols, rows } = options;

    const ptyProcess = pty.spawn(shell, [], {
        name: "xterm-256color",
        cols: cols ?? 80,
        rows: rows ?? 24,
        cwd: cwd ?? process.cwd(),
        env: {
            ...process.env,
            ...env,
            TERM: "xterm-256color"
        }
    });

    const dataCallbacks: Set<(data: string) => void> = new Set();
    const exitCallbacks: Set<(code: number, signal?: number) => void> = new Set();

    ptyProcess.onData((data) => {
        for (const callback of dataCallbacks) {
            callback(data);
        }
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
        for (const callback of exitCallbacks) {
            callback(exitCode, signal ?? undefined);
        }
    });

    return {
        pid: ptyProcess.pid,

        write(data: string): void {
            ptyProcess.write(data);
        },

        resize(cols: number, rows: number): void {
            ptyProcess.resize(cols, rows);
        },

        kill(signal?: string): void {
            // Windows 不支持信号，直接 kill
            try {
                ptyProcess.kill();
            } catch {
                // 忽略错误
            }
        },

        onData(callback: (data: string) => void): void {
            dataCallbacks.add(callback);
        },

        onExit(callback: (code: number, signal?: number) => void): void {
            exitCallbacks.add(callback);
        }
    };
}

/**
 * 获取默认 shell
 */
export function getDefaultShell(configShell: "cmd" | "powershell" | "bash"): string {
    switch (configShell) {
        case "powershell":
            return "powershell.exe";
        case "cmd":
            return "cmd.exe";
        case "bash":
            // Windows 上可能需要 WSL 或 Git Bash
            return "bash";
        default:
            return "powershell.exe";
    }
}
