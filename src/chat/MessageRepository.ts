import { Message } from "../providers/base"

type HistoryListener = (history: Message[]) => void;

export class MessageRepository {
    private history: Message[] = [];
    private listeners = new Set<HistoryListener>();

    addMessage(role: "user" | "model", content: string): string {
        const id = crypto.randomUUID();
        this.history.push({ id, role, content, createdAt: Date.now() });
        this.emitHistoryChanged();
        return id;
    }

    getMessage(id: string): Message | undefined {
        return this.history.find(m => m.id === id);
    }

    setMessageMeta(id: string, meta: { durationMs?: number }): void {
        const msg = this.history.find(m => m.id === id);
        if (!msg) return;
        if (meta.durationMs !== undefined) msg.durationMs = meta.durationMs;
        this.emitHistoryChanged();
    }

    deleteMessage(id: string): void {
        this.history = this.history.filter((m) => m.id !== id);
        this.emitHistoryChanged();
    }

    updateMessage(id: string, newContent: string): void {
        const msg = this.history.find(m => m.id === id);
        if (msg) {
            msg.content = newContent;
            this.emitHistoryChanged();
        }
    }

    getHistory(): Message[] {
        return [...this.history];
    }

    clear(): void {
        this.history = [];
        this.emitHistoryChanged();
    }

    getLastN(n: number): Message[] {
        return this.history.slice(-n);
    }

    truncateFromId(id: string): void {
        const index = this.history.findIndex(m => m.id === id)
        if (index !== -1) {
            this.history = this.history.slice(0, index);
            this.emitHistoryChanged();
        }
    }

    truncateAfterId(id: string): void {
        const index = this.history.findIndex(m => m.id === id)
        if (index !== -1) {
            this.history = this.history.slice(0, index + 1);
            this.emitHistoryChanged();
        }
    }

    getLength(): number {
        return this.history.length;
    }

    subscribe(listener: HistoryListener): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    private emitHistoryChanged(): void {
        const snapshot = this.getHistory();
        for (const listener of this.listeners) {
            listener(snapshot);
        }
    }

}
