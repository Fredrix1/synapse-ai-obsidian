export interface DocumentData {
    path: string;
    content: string;
    frontmatter?: Record<string, any>;
}

export class DocumentStore {
    store: Map<string, DocumentData>;

    constructor() {
        this.store = new Map<string, DocumentData>();
    }

    addDocument(path: string, data: DocumentData): void {
        this.store.set(path, data)
    }

    removeDocument(path: string): void {
        this.store.delete(path)
    }

    getDocument(path: string): DocumentData | undefined {
        return this.store.get(path)
    }

    getAllDocuments(): DocumentData[] {
        return Array.from(this.store.values());
    }

    searchByKeywords(query: string, limit = 3): DocumentData[] {
        const normalizedQuery = this.normalize(query);
        if (normalizedQuery.length < 3) {
            return [];
        }
        const tokens = this.tokenize(normalizedQuery);
        if (tokens.length === 0) {
            return [];
        }

        const scored = this.getAllDocuments()
            .map((doc) => {
                const normalizedPath = this.normalize(doc.path);
                const normalizedContent = this.normalize(doc.content);
                let score = 0;

                for (const token of tokens) {
                    score += this.countOccurrences(normalizedPath, token) * 3;
                    score += this.countOccurrences(normalizedContent, token);
                }

                if (normalizedContent.includes(normalizedQuery)) {
                    score += 5;
                }

                return { doc, score };
            })
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map((item) => item.doc);

        return scored;
    }

    private normalize(text: string): string {
        return text.toLowerCase().replace(/\s+/g, " ").trim();
    }

    private tokenize(query: string): string[] {
        const rawTokens = query.split(/[^a-zA-Zа-яА-ЯёЁ0-9_-]+/).filter(Boolean);
        const unique = new Set(rawTokens.filter((token) => token.length > 1));
        return Array.from(unique);
    }

    private countOccurrences(text: string, token: string): number {
        let count = 0;
        let fromIndex = 0;

        while (fromIndex < text.length) {
            const index = text.indexOf(token, fromIndex);
            if (index === -1) {
                break;
            }
            count += 1;
            fromIndex = index + token.length;
        }

        return count;
    }
}
