import fs from "node:fs";
import path from "node:path";

/**
 * JSON 文件存储工具
 */
export class JsonStorage<T> {
    private filePath: string;

    constructor(filePath: string) {
        this.filePath = filePath;
    }

    /**
     * 读取数据
     * @returns 数据或 null（文件不存在时）
     */
    read(): T | null {
        try {
            const content = fs.readFileSync(this.filePath, "utf-8");
            return JSON.parse(content) as T;
        } catch {
            return null;
        }
    }

    /**
     * 写入数据
     */
    write(data: T): void {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const content = JSON.stringify(data, null, 2);
        fs.writeFileSync(this.filePath, content, "utf-8");
    }

    /**
     * 更新数据（合并现有数据）
     */
    update(updater: (data: T | null) => T): void {
        const current = this.read();
        const updated = updater(current);
        this.write(updated);
    }

    /**
     * 删除文件
     */
    delete(): void {
        try {
            fs.unlinkSync(this.filePath);
        } catch {
            // 忽略文件不存在的错误
        }
    }

    /**
     * 检查文件是否存在
     */
    exists(): boolean {
        return fs.existsSync(this.filePath);
    }
}
