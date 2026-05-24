import { ConfigManager } from "../../storage/index.js";

/**
 * th init 命令
 * 初始化 TerminalHub 配置文件
 */
export function initCommand(): void {
    ConfigManager.init();
}
