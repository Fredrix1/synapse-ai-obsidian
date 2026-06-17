import { requestUrl } from "obsidian";
import { AIProvider, AIProviderOptions, Message, buildConversation } from "./base";
import { ApiError } from "../error";

interface OpenAIMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export class OpenAICompatibleProvider implements AIProvider {
    private baseUrl: string;
    private apiKey: string;
    private modelId: string;
    private corsBypass: boolean;
    private systemPrompt?: string;

    constructor(options: AIProviderOptions) {
        this.apiKey = options.apiKey;
        this.modelId = options.modelId;
        this.baseUrl = options.proxyUrl ?? "";
        this.corsBypass = options.corsBypass ?? false;
        this.systemPrompt = options.systemPrompt;
    }

    private buildMessages(prompt: string, history: Message[]): OpenAIMessage[] {
        const messages: OpenAIMessage[] = [];

        if (this.systemPrompt) {
            messages.push({ role: "system", content: this.systemPrompt });
        }

        for (const msg of buildConversation(history, prompt)) {
            messages.push({ role: msg.role === "model" ? "assistant" : "user", content: msg.content });
        }

        return messages;
    }

    private get headers(): Record<string, string> {
        const h: Record<string, string> = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey}`,
        };
        if (this.baseUrl.includes("openrouter.ai")) {
            h["HTTP-Referer"] = "https://obsidian.md";
            h["X-Title"] = "Synapse";
        }
        return h;
    }

    async generateResponse(prompt: string): Promise<string> {
        return this.generateChat(prompt, []);
    }

    async generateChat(prompt: string, history: Message[]): Promise<string> {
        const body = JSON.stringify({
            model: this.modelId,
            messages: this.buildMessages(prompt, history),
            stream: false,
        });

        let responseText: string;
        let status = 200;

        if (this.corsBypass) {
            const res = await requestUrl({
                url: this.baseUrl,
                method: "POST",
                headers: this.headers,
                body,
                throw: false
            });
            responseText = res.text;
            status = res.status;
        } else {
            const res = await fetch(this.baseUrl, {
                method: "POST",
                headers: this.headers,
                body,
            });
            responseText = await res.text();
            status = res.status;
        }

        if (status >= 400) {
            let detail = responseText.slice(0, 200);
            try {
                const errJson = JSON.parse(responseText);
                detail = errJson.error?.message || JSON.stringify(errJson);
            } catch { }
            throw new ApiError(`OpenAI API error (${status}): ${detail}`, status);
        }

        const json = JSON.parse(responseText);
        return json.choices?.[0]?.message?.content ?? "";
    }

    async *generateChatStream(prompt: string, history: Message[], signal?: AbortSignal): AsyncGenerator<string> {
        if (this.corsBypass) {
            const result = await this.generateChat(prompt, history);
            yield result;
            return;
        }

        const body = JSON.stringify({
            model: this.modelId,
            messages: this.buildMessages(prompt, history),
            stream: true,
        });

        try {
            const res = await fetch(this.baseUrl, {
                method: "POST",
                headers: this.headers,
                body,
                signal
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new ApiError(`OpenAI API error (${res.status}): ${errText.slice(0, 200)}`, res.status);
            }

            const contentType = res.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
                const text = await res.text();
                const json = JSON.parse(text);
                if (json.error) {
                    throw new ApiError(`OpenAI API error: ${json.error.message || JSON.stringify(json.error)}`);
                }
                const content = json.choices?.[0]?.message?.content;
                if (content) yield content;
                return;
            }

            const reader = res.body?.getReader();
            if (!reader) {
                throw new Error("ReadableStream not supported");
            }

            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                if (signal?.aborted) break;
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed === "data: [DONE]") continue;
                    if (!trimmed.startsWith("data: ")) continue;

                    try {
                        const json = JSON.parse(trimmed.slice(6));
                        const delta = json.choices?.[0]?.delta?.content;
                        if (delta) yield delta;
                    } catch {
                    }
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
