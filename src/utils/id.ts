import { randomUUID } from "node:crypto";

/**
 * 生成唯一会话 ID
 * 格式: th_{timestamp}_{random}
 */
export function generateSessionId(): string {
    const timestamp = Date.now();
    const random = randomUUID().split("-")[0];
    return `th_${timestamp}_${random}`;
}

/**
 * 生成请求 ID
 */
export function generateRequestId(): string {
    return randomUUID();
}
