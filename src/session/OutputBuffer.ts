/**
 * 环形缓冲区
 * 用于存储会话输出历史
 */
export class OutputBuffer {
    private buffer: string[];
    private maxSize: number;
    private cursor: number;
    private count: number;

    /**
     * @param maxSize 最大行数，必须从配置读取
     */
    constructor(maxSize: number) {
        if (!maxSize || maxSize <= 0) {
            throw new Error("OutputBuffer maxSize 必须是正整数");
        }
        this.maxSize = maxSize;
        this.buffer = new Array(maxSize).fill("");
        this.cursor = 0;
        this.count = 0;
    }

    /**
     * 写入数据
     */
    write(data: string): void {
        // 按行分割
        const lines = data.split("\n");

        for (const line of lines) {
            if (line === "" && lines.length === 1) continue;

            this.buffer[this.cursor] = line;
            this.cursor = (this.cursor + 1) % this.maxSize;
            if (this.count < this.maxSize) {
                this.count++;
            }
        }
    }

    /**
     * 获取最近 N 行
     */
    getRecentLines(n?: number): string[] {
        const lines: string[] = [];
        const targetCount = n !== undefined ? Math.min(n, this.count) : this.count;

        // 从最旧的开始
        const start = this.count < this.maxSize ? 0 : this.cursor;

        for (let i = 0; i < targetCount && i < this.count; i++) {
            const index = (start + i) % this.maxSize;
            const line = this.buffer[index];
            if (line !== undefined) {
                lines.push(line);
            }
        }

        return lines;
    }

    /**
     * 获取所有内容
     */
    getAll(): string {
        return this.getRecentLines().join("\n");
    }

    /**
     * 清空缓冲区
     */
    clear(): void {
        this.buffer = new Array(this.maxSize).fill("");
        this.cursor = 0;
        this.count = 0;
    }

    /**
     * 获取当前行数
     */
    size(): number {
        return this.count;
    }
}
