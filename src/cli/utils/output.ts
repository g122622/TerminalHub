import chalk from "chalk";

/**
 * 终端输出格式化工具
 */
export const output = {
    /**
     * 信息输出
     */
    info(message: string): void {
        console.log(chalk.blue("ℹ"), message);
    },

    /**
     * 成功输出
     */
    success(message: string): void {
        console.log(chalk.green("✓"), message);
    },

    /**
     * 警告输出
     */
    warn(message: string): void {
        console.log(chalk.yellow("⚠"), message);
    },

    /**
     * 错误输出
     */
    error(message: string): void {
        console.error(chalk.red("✗"), message);
    },

    /**
     * 标题输出
     */
    title(message: string): void {
        console.log("");
        console.log(chalk.bold.cyan(`  ${message}`));
        console.log("");
    },

    /**
     * 列表项输出
     */
    item(label: string, value: string): void {
        console.log(`  ${chalk.gray(label)} ${value}`);
    },

    /**
     * 分隔线
     */
    divider(): void {
        console.log(chalk.gray("─".repeat(50)));
    }
};
