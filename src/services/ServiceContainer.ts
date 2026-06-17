import { DocumentStore } from "../indexing/DocumentStore";
import { MessageRepository } from "../chat/MessageRepository";
import { ChatAutosaveService } from "../chat/ChatAutosaveService";
import { SynapseSettings, PROVIDER_URLS } from "../settings";
import { AIProvider } from "../providers/base";
import { GeminiProvider } from "../providers/gemini";
import { LoggerService } from "./LoggerService";
import { OpenAICompatibleProvider } from "../providers/openai"

export class ServiceContainer {
    readonly logger: LoggerService;
    readonly documentStore: DocumentStore;
    readonly messageRepository: MessageRepository;
    readonly chatAutosaveService: ChatAutosaveService;
    readonly settings: SynapseSettings;

    constructor(settings: SynapseSettings, documentStore: DocumentStore, messageRepository: MessageRepository, chatAutosaveService: ChatAutosaveService, logger: LoggerService) {
        this.logger = logger;
        this.settings = settings;
        this.documentStore = documentStore;
        this.messageRepository = messageRepository;
        this.chatAutosaveService = chatAutosaveService;
    }

    getAIProvider(modelId: string): AIProvider {
        const config = this.settings.models.find(m => m.id === modelId);
        if (!config) {
            throw new Error(`Model "${modelId}" not found in settings.models`);
        }

        const apiKey = config.apiKey || this.settings.apiKey[config.provider] || "";

        if (config.provider === "gemini") {
            const proxyUrl = this.settings.proxyUrl || config.baseUrl || undefined;
            return new GeminiProvider({ apiKey, modelId: config.name, proxyUrl, systemPrompt: this.settings.systemPrompt, logger: this.logger });
        }

        let baseUrl = config.baseUrl || PROVIDER_URLS[config.provider] || "";
        if (!baseUrl.endsWith("/chat/completions")) {
            baseUrl += "/chat/completions";
        }
        return new OpenAICompatibleProvider({ apiKey, modelId: config.name, proxyUrl: baseUrl, corsBypass: config.corsBypass, systemPrompt: this.settings.systemPrompt, logger: this.logger });
    }

    async dispose(): Promise<void> {
        await this.chatAutosaveService.dispose();
    }
}
