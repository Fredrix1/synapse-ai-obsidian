import { App, normalizePath, TFile } from "obsidian";
import { MessageRepository } from "./MessageRepository";
import { Message } from "../providers/base";
import { LoggerService } from "../services/LoggerService";
import { SynapseSettings } from "../settings";
import { t } from "../i18n";

const AUTOSAVE_DEBOUNCE_MS = 800;

export class ChatAutosaveService {
    private sessionId: string;
    private sessionStartedAt: string;
    private filePath: string;
    private readonly isHiddenStorage: boolean;
    private readonly folder: string;
    private unsubscribe: (() => void) | null = null;
    private saveTimer: number | null = null;
    private pendingHistory: Message[] = [];
    private saveChain: Promise<void> = Promise.resolve();
    private renamed: boolean = false;

    constructor(private app: App, private repository: MessageRepository, private getSettings: () => SynapseSettings, private logger?: LoggerService) {
        const now = new Date();
        this.sessionStartedAt = now.toISOString();
        this.sessionId = this.buildSessionId(now);
        const folder = this.getSettings().autosaveChatPath.trim() || `${this.app.vault.configDir}/plugins/synapse-ai/chats`;
        this.isHiddenStorage = folder.startsWith(this.app.vault.configDir);
        const fileName = `CHAT-${this.sessionId}.md`;
        this.filePath = normalizePath(`${folder}/${fileName}`);
        this.folder = folder;
    }

    start(): void {
        if (this.unsubscribe) {
            return;
        }
        this.unsubscribe = this.repository.subscribe((history) => {
            this.pendingHistory = history;
            this.scheduleSave();
        });
    }

    stop(): void {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }

    async dispose(): Promise<void> {
        if (this.saveTimer !== null) {
            window.clearTimeout(this.saveTimer);
            this.saveTimer = null;
            const snapshot = [...this.pendingHistory];
            this.queueSave(snapshot);
        }
        await this.saveChain;
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }

    public async resetSession(): Promise<void> {
        await this.dispose();

        const now = new Date();
        this.sessionId = this.buildSessionId(now);
        this.sessionStartedAt = now.toISOString();
        this.filePath = normalizePath(this.folder + "/CHAT-" + this.sessionId + ".md");
        this.renamed = false;
        this.pendingHistory = [];

        if (this.getSettings().autosaveChat) this.start();
    }

    private scheduleSave(): void {
        if (this.saveTimer !== null) {
            window.clearTimeout(this.saveTimer);
        }
        this.saveTimer = window.setTimeout(() => {
            this.saveTimer = null;
            const snapshot = [...this.pendingHistory];
            this.queueSave(snapshot);
        }, AUTOSAVE_DEBOUNCE_MS);
    }

    private queueSave(history: Message[]): void {
        this.saveChain = this.saveChain
            .then(async () => this.persistHistory(history))
            .catch((error) => {
                if (this.logger) this.logger.error("Не удалось автосохранить чат", error);
            });
    }

    private async persistHistory(history: Message[]): Promise<void> {
        if (!this.renamed) {
            const firstUserMessage = history.find(msg => msg.role === "user");
            if (firstUserMessage) {
                const clean = this.sanitizeFileName(firstUserMessage.content);
                const newFileName = `CHAT-${this.sessionId} ${clean}.md`;
                this.filePath = normalizePath(`${this.folder}/${newFileName}`);
                this.renamed = true;
            }
        }
        if (this.isHiddenStorage) {
            await this.ensureFolder();
            const content = this.buildMarkdown(history);
            await this.app.vault.adapter.write(this.filePath, content);
            return;
        }
        await this.ensureFolder();
        const content = this.buildMarkdown(history);
        const existing = this.app.vault.getAbstractFileByPath(this.filePath);
        if (existing instanceof TFile) {
            await this.app.vault.modify(existing, content);
            return;
        }
        await this.app.vault.create(this.filePath, content);
    }


    private async ensureFolder(): Promise<void> {
        const parts = this.filePath.split("/");
        parts.pop();
        let currentPath = "";
        if (this.isHiddenStorage) {
            for (const part of parts) {
                currentPath = currentPath ? `${currentPath}/${part}` : part;
                if (!(await this.app.vault.adapter.exists(currentPath))) {
                    await this.app.vault.adapter.mkdir(currentPath);
                }
            }
        } else {
            for (const part of parts) {
                currentPath = currentPath ? `${currentPath}/${part}` : part;
                const normalized = normalizePath(currentPath);
                if (!this.app.vault.getAbstractFileByPath(normalized)) {
                    await this.app.vault.createFolder(normalized);
                }
            }
        }
    }


    private buildMarkdown(history: Message[]): string {
        const nowIso = new Date().toISOString();
        const lines: string[] = [
            "---",
            `tags: [${this.getSettings().defaultTag}]`,
            "type: synapse-chat",
            `session_id: ${this.sessionId}`,
            `created_at: ${this.sessionStartedAt}`,
            `updated_at: ${nowIso}`,
            "---",
            "",
            "# Synapse Chat Session",
            ""
        ];

        if (history.length === 0) {
            lines.push(t("chat.autosave.emptyHistory"));
            return lines.join("\n");
        }

        for (const message of history) {
            lines.push(`## ${message.role === "user" ? "User" : "Synapse"}`);
            lines.push("");
            lines.push(message.content);
            lines.push("");
        }

        return lines.join("\n");
    }

    private buildSessionId(date: Date): string {
        const year = date.getFullYear();
        const month = `${date.getMonth() + 1}`.padStart(2, "0");
        const day = `${date.getDate()}`.padStart(2, "0");
        const hours = `${date.getHours()}`.padStart(2, "0");
        const minutes = `${date.getMinutes()}`.padStart(2, "0");
        const seconds = `${date.getSeconds()}`.padStart(2, "0");
        return `${year}${month}${day}-${hours}${minutes}${seconds}`;
    }

    public saveNow(): void {
        if (this.saveTimer !== null) {
            window.clearTimeout(this.saveTimer);
            this.saveTimer = null;
        }
        const snapshot = [...this.pendingHistory];
        this.queueSave(snapshot);
    }

    private sanitizeFileName(fileName: string): string {
        const sanitized = fileName.replace(/[\\/:*?"<>|\[\]#^]/g, "_").substring(0, 50);
        const idx = sanitized.lastIndexOf(" ");
        const cutIndex = idx > 0 ? idx : sanitized.length;
        return sanitized.substring(0, cutIndex).trim();
    }
}
