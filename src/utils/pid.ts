import fs from "node:fs";
import path from "node:path";

/**
 * 检查进程是否存活
 * @param pid 进程 ID
 * @returns 进程是否存活
 */
export function isProcessAlive(pid: number): boolean {
    try {
        // 发送信号 0 检查进程是否存在
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

/**
 * 终止进程
 * @param pid 进程 ID
 * @param signal 信号，默认 SIGTERM
 */
export function killProcess(pid: number, signal: NodeJS.Signals = "SIGTERM"): void {
    try {
        process.kill(pid, signal);
    } catch (error) {
        // 进程可能已经不存在
        if ((error as NodeJS.ErrnoException).code !== "ESRCH") {
            throw error;
        }
    }
}

/**
 * 读取 PID 文件
 * @param pidPath PID 文件路径
 * @returns PID 或 null
 */
export function readPidFile(pidPath: string): number | null {
    try {
        const content = fs.readFileSync(pidPath, "utf-8").trim();
        const pid = parseInt(content, 10);
        if (isNaN(pid)) {
            return null;
        }
        return pid;
    } catch {
        return null;
    }
}

/**
 * 写入 PID 文件
 * @param pidPath PID 文件路径
 * @param pid 进程 ID
 */
export function writePidFile(pidPath: string, pid: number): void {
    const dir = path.dirname(pidPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(pidPath, pid.toString(), "utf-8");
}

/**
 * 删除 PID 文件
 * @param pidPath PID 文件路径
 */
export function removePidFile(pidPath: string): void {
    try {
        fs.unlinkSync(pidPath);
    } catch {
        // 忽略文件不存在的错误
    }
}
