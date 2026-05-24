type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerOptions {
    level: LogLevel;
    prefix?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};

/**
 * 简单的日志工具
 */
export class Logger {
    private level: number;
    private prefix: string;

    constructor(options: LoggerOptions) {
        this.level = LOG_LEVELS[options.level] ?? LOG_LEVELS.info;
        this.prefix = options.prefix ?? "TerminalHub";
    }

    private formatMessage(level: LogLevel, message: string): string {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${this.prefix}] [${level.toUpperCase()}] ${message}`;
    }

    debug(message: string): void {
        if (this.level <= LOG_LEVELS.debug) {
            console.debug(this.formatMessage("debug", message));
        }
    }

    info(message: string): void {
        if (this.level <= LOG_LEVELS.info) {
            console.info(this.formatMessage("info", message));
        }
    }

    warn(message: string): void {
        if (this.level <= LOG_LEVELS.warn) {
            console.warn(this.formatMessage("warn", message));
        }
    }

    error(message: string, error?: Error): void {
        if (this.level <= LOG_LEVELS.error) {
            const fullMessage = error ? `${message}: ${error.message}` : message;
            console.error(this.formatMessage("error", fullMessage));
            if (error?.stack) {
                console.error(error.stack);
            }
        }
    }
}

/**
 * 创建日志实例
 */
export function createLogger(options: LoggerOptions): Logger {
    return new Logger(options);
}
