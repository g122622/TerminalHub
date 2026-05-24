import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import type { Config } from "../types/index.js";
import { REQUIRED_CONFIG_PATHS } from "../types/config.js";

/**
 * TerminalHub 数据目录固定路径
 */
export const TERMINALHUB_DIR = path.join(os.homedir(), ".terminalhub");

/**
 * 配置文件路径
 */
export const CONFIG_PATH = path.join(TERMINALHUB_DIR, "config.json");

/**
 * 会话元数据文件路径
 */
export const SESSIONS_PATH = path.join(TERMINALHUB_DIR, "sessions.json");

/**
 * Daemon PID 文件路径
 */
export const DAEMON_PID_PATH = path.join(TERMINALHUB_DIR, "daemon.pid");

/**
 * 日志目录
 */
export const LOGS_DIR = path.join(TERMINALHUB_DIR, "logs");

/**
 * 默认配置模板
 * 注意: th init 使用此模板生成配置文件，运行时必须从配置文件读取
 */
export const DEFAULT_CONFIG: Config = {
    version: "1.0.0",
    daemon: {
        socketPath: path.join(TERMINALHUB_DIR, "daemon.sock"),
        logLevel: "info"
    },
    session: {
        outputBufferLines: 1000,
        titleMaxLength: 50,
        defaultShell: "powershell"
    },
    terminal: {
        cols: 80,
        rows: 24
    }
};

/**
 * 配置管理器
 *
 * 原则:
 * 1. 禁止硬编码默认值 - 运行时必须从配置文件读取
 * 2. 禁止静默回退 - 配置缺失直接报错
 * 3. 禁止命令行配置参数 - 所有配置仅通过配置文件管理
 */
export class ConfigManager {
    private config: Config | null = null;

    /**
     * 加载配置文件
     * @throws 配置文件不存在或配置项缺失时抛出错误
     */
    load(): Config {
        // 检查文件是否存在
        if (!fs.existsSync(CONFIG_PATH)) {
            throw new Error(
                `配置文件不存在: ${CONFIG_PATH}\n` + "请运行 'th init' 初始化配置"
            );
        }

        // 读取并解析
        const content = fs.readFileSync(CONFIG_PATH, "utf-8");
        let config: Config;
        try {
            config = JSON.parse(content);
        } catch (e) {
            throw new Error(`配置文件格式错误: ${CONFIG_PATH}\n${(e as Error).message}`);
        }

        // 验证必填字段
        this.validate(config);

        this.config = config;
        return config;
    }

    /**
     * 获取已加载的配置
     * @throws 未加载配置时抛出错误
     */
    get(): Config {
        if (!this.config) {
            throw new Error("配置未加载，请先调用 load()");
        }
        return this.config;
    }

    /**
     * 验证配置完整性
     * @throws 缺少必填字段时抛出错误
     */
    private validate(config: Config): void {
        for (const path of REQUIRED_CONFIG_PATHS) {
            const value = this.getNestedValue(config, path);
            if (value === undefined) {
                throw new Error(`配置项缺失: ${path}`);
            }
        }
    }

    /**
     * 获取嵌套对象的值
     */
    private getNestedValue(obj: unknown, path: string): unknown {
        const keys = path.split(".");
        let current: unknown = obj;
        for (const key of keys) {
            if (current === null || current === undefined) {
                return undefined;
            }
            if (typeof current !== "object") {
                return undefined;
            }
            current = (current as Record<string, unknown>)[key];
        }
        return current;
    }

    /**
     * 初始化配置文件
     * 创建目录结构和默认配置文件
     */
    static init(): void {
        // 创建目录
        if (!fs.existsSync(TERMINALHUB_DIR)) {
            fs.mkdirSync(TERMINALHUB_DIR, { recursive: true });
            console.log(`✓ 创建目录 ${TERMINALHUB_DIR}/`);
        }

        if (!fs.existsSync(LOGS_DIR)) {
            fs.mkdirSync(LOGS_DIR, { recursive: true });
            console.log(`✓ 创建目录 ${LOGS_DIR}/`);
        }

        // 检查配置文件是否已存在
        if (fs.existsSync(CONFIG_PATH)) {
            console.log(`配置文件已存在: ${CONFIG_PATH}`);
            console.log("如需重置，请先删除现有配置文件");
            return;
        }

        // 生成默认配置
        const configContent = JSON.stringify(DEFAULT_CONFIG, null, 2);
        fs.writeFileSync(CONFIG_PATH, configContent, "utf-8");
        console.log(`✓ 生成配置文件 ${CONFIG_PATH}`);
        console.log("");
        console.log("配置文件已创建，请根据需要修改配置项。");
    }
}
