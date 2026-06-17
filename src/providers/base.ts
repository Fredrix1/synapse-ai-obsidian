export interface Message {
    id: string;
    role: "user" | "model";
    content: string;
    createdAt?: number;
    durationMs?: number;
}

export interface AIProvider {
    generateResponse(prompt: string): Promise<string>;
    generateChat(prompt: string, history: Message[]): Promise<string>;
    generateChatStream(prompt: string, history: Message[], signal?: AbortSignal): AsyncGenerator<string>;
}

export interface AIProviderOptions {
    apiKey: string;
    modelId: string;
    proxyUrl?: string;
    systemPrompt?: string;
    corsBypass?: boolean;
    logger?: any;
}

export function buildConversation(history: Message[], prompt: string): Message[] {
    const convo: Message[] = [];
    const add = (role: "user" | "model", content: string) => {
        if (!content.trim()) return;
        const last = convo[convo.length - 1];
        if (last && last.role === role) {
            last.content += "\n\n" + content;
        } else {
            convo.push({ id: "", role, content });
        }
    };
    for (const msg of history) add(msg.role, msg.content);
    add("user", prompt);
    return convo;
}