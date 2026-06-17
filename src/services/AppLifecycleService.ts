import { App } from "obsidian";
import { DocumentStore } from "../indexing/DocumentStore";
import { MessageRepository } from "../chat/MessageRepository";
import { ChatAutosaveService } from "../chat/ChatAutosaveService";
import { Indexer } from "../indexing/Indexer";
import { ServiceContainer } from "./ServiceContainer";
import { SynapseSettings } from "../settings";
import { LoggerService } from "./LoggerService";

export class AppLifecycleService {

    constructor(private app: App, private settings: SynapseSettings) { };

    createServices(): ServiceContainer {
        const logger = new LoggerService(() => this.settings);
        logger.debug("Старт иницилизации")
        const documentStore = new DocumentStore();
        const messageRepository = new MessageRepository();
        const chatAutosaveService = new ChatAutosaveService(this.app, messageRepository, () => this.settings, logger);
        if (this.settings.autosaveChat) {
            chatAutosaveService.start();
        }
        const container = new ServiceContainer(this.settings, documentStore, messageRepository, chatAutosaveService, logger)
        return container;
    }

    startBackgroundIndexing(documentStore: DocumentStore, logger: LoggerService): void {
        this.app.workspace.onLayoutReady(async () => {
            const indexer = new Indexer(this.app, documentStore, this.settings.autosaveChatPath, logger);
            await indexer.buildInitialIndex();
            indexer.registerVaultEvents();
            logger.debug("Индексация завершена");
            logger.debug("Инициализация завершена");
        })
    }
}
