import { App, TFile, TAbstractFile } from "obsidian";
import { DocumentStore } from "./DocumentStore";
import { LoggerService } from "../services/LoggerService";

export class Indexer {
    private app: App;
    private store: DocumentStore;
    private excludePath: string;
    private logger: LoggerService;

    constructor(app: App, store: DocumentStore, excludePath: string, logger: LoggerService) {
        this.app = app;
        this.store = store;
        this.logger = logger;
        const trimmed = excludePath.trim()
        if (trimmed) {
            this.excludePath = trimmed.endsWith("/") ? trimmed : trimmed + "/";
        } else {
            this.excludePath = "";
        }
    }

    public async buildInitialIndex() {
        const files: TFile[] = this.app.vault.getMarkdownFiles();
        this.logger.debug(`[Synapse] найдено ${files.length} markdown файлов.`);
        let indexed = 0;
        for (const file of files) {
            const cache = this.app.metadataCache.getFileCache(file);
            const properties = cache?.frontmatter;
            if (!this.shouldExclude(file)) {
                const content = await this.app.vault.cachedRead(file);
                this.store.addDocument(file.path, { path: file.path, content, frontmatter: properties });
                indexed++;
            }
        }
        this.logger.debug(`[Synapse] Проиндексировано ${indexed} файлов из ${files.length}`);
    }
    public async registerVaultEvents() {
        this.app.vault.on("create", async (file: TAbstractFile) => {
            if (file instanceof TFile && file.extension === "md") {
                const cache = this.app.metadataCache.getFileCache(file);
                const properties = cache?.frontmatter;
                if (!this.shouldExclude(file)) {
                    const content = await this.app.vault.cachedRead(file);
                    this.store.addDocument(file.path, { path: file.path, content, frontmatter: properties });
                }
            }
        })
        this.app.vault.on("delete", (file: TAbstractFile) => {
            if (file instanceof TFile && file.extension === "md") {
                this.store.removeDocument(file.path);
            }
        })
        this.app.vault.on("modify", async (file: TAbstractFile) => {
            if (file instanceof TFile && file.extension === "md") {
                const cache = this.app.metadataCache.getFileCache(file);
                const properties = cache?.frontmatter;
                if (!this.shouldExclude(file)) {
                    const content = await this.app.vault.cachedRead(file);
                    this.store.addDocument(file.path, { path: file.path, content, frontmatter: properties });
                }
            }
        })
    }

    private shouldExclude(file: TFile): boolean {
        if (!this.excludePath) return false;
        return file.path.startsWith(this.excludePath);
    }
}
