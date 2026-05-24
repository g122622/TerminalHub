import fs from "node:fs";
import { JsonStorage } from "../storage/index.js";
import type { SessionMetadata, SessionListItem } from "../types/index.js";
import { isProcessAlive } from "../utils/pid.js";
import { SESSIONS_PATH } from "../storage/ConfigManager.js";

/**
 * 会话持久化存储
 */
export class SessionRegistry {
    private storage: JsonStorage<Record<string, SessionMetadata>>;

    constructor() {
        this.storage = new JsonStorage(SESSIONS_PATH);
    }

    /**
     * 加载所有会话元数据
     */
    loadAll(): Record<string, SessionMetadata> {
        return this.storage.read() || {};
    }

    /**
     * 保存会话元数据
     */
    save(metadata: SessionMetadata): void {
        this.storage.update((sessions) => {
            const data = sessions || {};
            data[metadata.id] = metadata;
            return data;
        });
    }

    /**
     * 删除会话元数据
     */
    delete(sessionId: string): void {
        this.storage.update((sessions) => {
            const data = sessions || {};
            delete data[sessionId];
            return data;
        });
    }

    /**
     * 获取单个会话
     */
    get(sessionId: string): SessionMetadata | null {
        const sessions = this.loadAll();
        return sessions[sessionId] || null;
    }

    /**
     * 获取会话列表 (带存活状态)
     */
    list(): SessionListItem[] {
        const sessions = this.loadAll();
        const list: SessionListItem[] = [];

        for (const [id, metadata] of Object.entries(sessions)) {
            list.push({
                id,
                title: metadata.title,
                shell: metadata.shell,
                pid: metadata.pid,
                createdAt: metadata.createdAt,
                lastActivityAt: metadata.lastActivityAt,
                connectedClients: metadata.connectedClients,
                alive: isProcessAlive(metadata.pid)
            });
        }

        // 按最后活动时间排序
        return list.sort((a, b) => b.lastActivityAt - a.lastActivityAt);
    }

    /**
     * 清理无效会话
     */
    cleanup(): string[] {
        const sessions = this.loadAll();
        const removed: string[] = [];

        for (const [id, metadata] of Object.entries(sessions)) {
            if (!isProcessAlive(metadata.pid)) {
                removed.push(id);
            }
        }

        if (removed.length > 0) {
            this.storage.update((data) => {
                const sessions = data || {};
                for (const id of removed) {
                    delete sessions[id];
                }
                return sessions;
            });
        }

        return removed;
    }
}
