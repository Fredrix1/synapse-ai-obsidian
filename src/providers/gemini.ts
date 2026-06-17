import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIProvider, AIProviderOptions, Message, buildConversation } from "./base";

export class GeminiProvider implements AIProvider {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(options: AIProviderOptions) {
        this.genAI = new GoogleGenerativeAI(options.apiKey);
        const requestOptions = options.proxyUrl ? { baseUrl: options.proxyUrl } : undefined;
        this.model = this.genAI.getGenerativeModel({ model: options.modelId, systemInstruction: options.systemPrompt || undefined }, requestOptions);
    }

    async generateResponse(prompt: string): Promise<string> {
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    }

    async generateChat(prompt: string, history: Message[]): Promise<string> {
        const convo = buildConversation(history, prompt);
        const lastUser = convo[convo.length - 1];
        const geminiHistory = convo.slice(0, -1).map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content }]
        }))
        const chat = this.model.startChat({ history: geminiHistory })
        const result = await chat.sendMessage(lastUser?.content ?? prompt)
        const response = await result.response;
        return response.text();
    }

    async *generateChatStream(prompt: string, history: Message[], signal?: AbortSignal): AsyncGenerator<string> {
        try {
            const convo = buildConversation(history, prompt);
            const lastUser = convo[convo.length - 1];
            const geminiHistory = convo.slice(0, -1).map(msg => ({
                role: msg.role,
                parts: [{ text: msg.content }]
            }))
            const chat = this.model.startChat({ history: geminiHistory })
            const result = await chat.sendMessageStream(lastUser?.content ?? prompt, { signal })
            for await (const chunk of result.stream) {
                if (signal?.aborted) break;
                const text = chunk.text();
                if (text) {
                    yield text;
                }
            }
        } catch (error: any) {
            if (error.name === "AbortError") {
                return;
            }
            throw error;
        }
    }


}