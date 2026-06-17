import { ItemView, WorkspaceLeaf, setIcon, Notice, Menu, MarkdownRenderer, normalizePath } from "obsidian";
import { ServiceContainer } from "../services/ServiceContainer";
import { Message } from "../providers/base";
import { t, setLanguage } from "../i18n";

export const VIEW_TYPE_CHAT = "synapse-chat-view"

export class ChatView extends ItemView {
    private messageContainer!: HTMLElement;
    private services: ServiceContainer;
    private activeThinkingInterval: number | null = null;
    private isRequestInFlight = false;
    private currentModelId: string | null = null;
    private activeAbortController: AbortController | null = null;
    private sendBtn!: HTMLElement;
    private textarea!: HTMLTextAreaElement;
    private activePopover: HTMLElement | null = null;
    private closePopoverHandler: ((evt: MouseEvent) => void) | null = null;

    constructor(Leaf: WorkspaceLeaf, services: ServiceContainer, private plugin: any) {
        super(Leaf);
        this.services = services;
        this.currentModelId = this.services.settings.defaultModel;
    }

    getViewType(): string {
        return VIEW_TYPE_CHAT;
    }

    getDisplayText(): string {
        return "Synapse Chat";
    }

    getIcon(): string {
        return "message-circle";
    }

    addMessage(id: string, text: string, sender: "user" | "ai"): { msgDiv: HTMLElement, contentEl: HTMLElement } {
        const msgDiv = this.messageContainer.createDiv({
            cls: `synapse-message synapse-message--${sender}`,
        });



        const contentEl = msgDiv.createDiv({
            cls: `synapse-message__content`,
            text
        });

        this.createToolbar(msgDiv, contentEl, id, sender);
        return { msgDiv, contentEl };
    }

    private setGeneratingState(isGenerating: boolean) {
        this.isRequestInFlight = isGenerating;
        if (isGenerating) {
            setIcon(this.sendBtn, "stop-circle");
            this.textarea.setAttr("disabled", "true");
        } else {
            setIcon(this.sendBtn, "send");
            this.textarea.removeAttribute("disabled");
            this.textarea.focus();
            this.activeAbortController = null;
        }
    }

    async onOpen() {
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass("synapse-chat");
        const headerEl = createDiv({ cls: "synapse-chat__header" });
        headerEl.style.display = this.services.settings.showTitleBar ? "flex" : "none";
        const leftEl = headerEl.createDiv({ cls: "synapse-chat__header-left" });
        const settingsBtn = leftEl.createEl("button", { cls: "synapse-icon-btn" });
        setIcon(settingsBtn, "settings");
        settingsBtn.addEventListener('click', () => {
            const setting = (this.app as any).setting;
            setting.open();
            setting.openTabById("synapse-ai")
        });
        leftEl.createEl("h2", { text: t("chat.title") });
        const rightEl = headerEl.createDiv({ cls: "synapse-chat__header-right" });
        const languageWrapper = rightEl.createDiv({ cls: "synapse-chat__language-wrapper" })
        const languageSelect = languageWrapper.createEl("select", { cls: "synapse-chat__language-select" });
        languageSelect.createEl("option", { text: "RU", value: "ru" });
        languageSelect.createEl("option", { text: "EN", value: "en" });
        languageSelect.value = this.services.settings.language;
        const langChevron = languageWrapper.createSpan({ cls: "synapse-chat__language-chevron" });
        setIcon(langChevron, "chevron-down")
        languageSelect.addEventListener("change", async (e) => {
            const newVal = (e.target as HTMLSelectElement).value;
            this.services.settings.language = newVal;
            await this.plugin.saveSettings();
        });
        this.registerEvent((this.app.workspace as any).on("synapse:setting-updated", () => {
            setLanguage(this.services.settings.language);
            languageSelect.value = this.services.settings.language;
            this.textarea.setAttr("placeholder", t("chat.inputPlaceholder"));
            const titleEl = this.containerEl.querySelector(".synapse-chat__header h2");
            if (titleEl) titleEl.setText(t("chat.title"));
            const emptyEl = this.messageContainer.querySelector(".synapse-chat__empty-state");
            if (emptyEl) { emptyEl.remove(); this.renderEmptyState(); }
        }));
        container.appendChild(headerEl);
        this.messageContainer = container.createDiv({ cls: "synapse-chat__messages" });
        const history = this.services.messageRepository.getHistory();
        if (history.length === 0) {
            this.renderEmptyState();
        }
        const inputArea = container.createDiv({ cls: "synapse-input" });
        this.textarea = inputArea.createEl("textarea", { attr: { placeholder: t("chat.inputPlaceholder") }, cls: "synapse-input__field" });
        const inputBar = inputArea.createDiv({ cls: "synapse-input__toolbar" });
        const leftToolbar = inputBar.createDiv({ cls: "synapse-input__toolbar-left" });
        const modelSelect = leftToolbar.createDiv({ cls: "synapse-model-select" });
        const modelSelectBtn = modelSelect.createEl("button", { cls: "synapse-model-select__btn" });

        const getCurrentModelName = () => {
            const modelId = this.currentModelId || this.services.settings.defaultModel;
            const currentModel = this.services.settings.models.find(m => m.id === modelId);
            return currentModel ? (currentModel.displayName || currentModel.name) : (modelId || t("chat.fallbackModel"));
        };

        const modelNameSpan = modelSelectBtn.createSpan({ text: getCurrentModelName() });
        const chevronEli = modelSelectBtn.createSpan();
        setIcon(chevronEli, "chevron-down");

        modelSelectBtn.addEventListener("click", (e) => {
            const menu = new Menu();
            const activeId = this.currentModelId || this.services.settings.defaultModel;
            this.services.settings.models.forEach(model => {
                menu.addItem(item => {
                    item.setTitle(model.displayName || model.name)
                        .setChecked(activeId === model.id)
                        .onClick(async () => {
                            this.currentModelId = model.id;
                            modelNameSpan.setText(model.displayName || model.name);
                        });
                });
            });
            const rect = modelSelectBtn.getBoundingClientRect();
            menu.showAtPosition({ x: rect.left, y: rect.top });
        });

        this.registerEvent((this.app.workspace as any).on("synapse:setting-updated", () => {
            modelNameSpan.setText(getCurrentModelName());
        }));
        const newChat = leftToolbar.createEl("button", { cls: "synapse-icon-btn" });
        setIcon(newChat, "message-square-plus");
        newChat.addEventListener("click", async () => {
            if (this.isRequestInFlight) return;

            await this.services.chatAutosaveService.resetSession();
            this.services.messageRepository.clear();

            this.messageContainer.empty();
            this.renderEmptyState()
        });
        const kebabMenu = leftToolbar.createEl("button", { cls: "synapse-icon-btn" });
        setIcon(kebabMenu, "ellipsis");
        kebabMenu.addEventListener("click", (e) => {
            e.stopPropagation();
            if (this.activePopover) {
                this.closeKebabPopover();
                return;
            }

            const popover = createDiv({ cls: "synapse-kebab-popover" });
            this.activePopover = popover;
            document.body.appendChild(popover);

            const rect = kebabMenu.getBoundingClientRect();
            popover.style.position = "absolute";
            popover.style.bottom = `${window.innerHeight - rect.top + 8}px`;
            popover.style.right = `${window.innerWidth - rect.right}px`;

            const item1 = popover.createDiv({ cls: "synapse-kebab-item" });
            const icon1 = item1.createDiv({ cls: "synapse-kebab-item__icon" });
            setIcon(icon1, "sparkles");
            item1.createDiv({ cls: "synapse-kebab-item__text", text: t("chat.kebabMenu.prompts") });
            const toggle1 = item1.createDiv({ cls: `checkbox-container ${this.services.settings.showSuggestedPrompts ? 'is-enabled' : ''}` });
            item1.addEventListener("click", async (ev) => {
                ev.stopPropagation();
                this.services.settings.showSuggestedPrompts = !this.services.settings.showSuggestedPrompts;
                toggle1.toggleClass('is-enabled', this.services.settings.showSuggestedPrompts);
                await this.plugin.saveSettings();
                const grid = this.containerEl.querySelector(".synapse-empty-state__prompt-card") as HTMLElement;
                if (grid) {
                    grid.style.display = this.services.settings.showSuggestedPrompts ? "" : "none";
                }
            });

            const item2 = popover.createDiv({ cls: "synapse-kebab-item" });
            const icon2 = item2.createDiv({ cls: "synapse-kebab-item__icon" });
            setIcon(icon2, "layout-panel-top");
            item2.createDiv({ cls: "synapse-kebab-item__text", text: t("chat.kebabMenu.titleBar") });
            const toggle2 = item2.createDiv({ cls: `checkbox-container ${this.services.settings.showTitleBar ? 'is-enabled' : ''}` });
            item2.addEventListener("click", async (ev) => {
                ev.stopPropagation();
                this.services.settings.showTitleBar = !this.services.settings.showTitleBar;
                toggle2.toggleClass('is-enabled', this.services.settings.showTitleBar);
                await this.plugin.saveSettings();
                const currentHeader = this.containerEl.querySelector(".synapse-chat__header") as HTMLElement;
                if (currentHeader) {
                    currentHeader.style.display = this.services.settings.showTitleBar ? "flex" : "none";
                }
            });

            popover.createDiv({ cls: "synapse-kebab-separator" });

            const item3 = popover.createDiv({ cls: "synapse-kebab-item" });
            const icon3 = item3.createDiv({ cls: "synapse-kebab-item__icon" });
            setIcon(icon3, "settings");
            item3.createDiv({ cls: "synapse-kebab-item__text", text: t("chat.kebabMenu.settings") });
            item3.addEventListener("click", (ev) => {
                ev.stopPropagation();
                const setting = (this.app as any).setting;
                setting.open();
                setting.openTabById("synapse-ai");
                this.closeKebabPopover();
            });

            this.closePopoverHandler = (evt: MouseEvent) => {
                if (this.activePopover && !this.activePopover.contains(evt.target as Node)) {
                    this.closeKebabPopover();
                }
            };
            document.addEventListener("click", this.closePopoverHandler);
        });
        const rightToolbar = inputBar.createDiv({ cls: "synapse-input__toolbar-right" });
        this.sendBtn = rightToolbar.createEl("button", { cls: "synapse-icon-btn" });
        setIcon(this.sendBtn, "send");
        this.sendBtn.addEventListener("click", async () => {
            if (this.isRequestInFlight) {
                if (this.activeAbortController) {
                    this.activeAbortController.abort();
                    this.activeAbortController = null;
                }
                return;
            }
            const prompt = this.textarea.value.trim();
            if (!prompt) return;
            this.setGeneratingState(true);
            const userMessageId = this.services.messageRepository.addMessage("user", prompt);
            const emptyState = this.messageContainer.querySelector(".synapse-chat__empty-state");
            if (emptyState) emptyState.remove();
            this.addMessage(userMessageId, prompt, "user");
            this.textarea.value = "";
            try {
                this.activeAbortController = new AbortController();
                await this.executeInference(prompt);
            } finally {
                this.setGeneratingState(false);
            }
        });
        this.textarea.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                this.sendBtn.click();
            }
        });
    }

    private renderEmptyState(): void {
        const emptyStateEl = this.messageContainer.createDiv({ cls: "synapse-chat__empty-state" });
        this.renderLogo(emptyStateEl);
        emptyStateEl.createEl("h1", ({ text: t("chat.emptyState.greeting") }));
        const promptGrid = emptyStateEl.createDiv({ cls: "synapse-empty-state__prompt-card" });
        promptGrid.style.display = this.services.settings.showSuggestedPrompts ? "" : "none";
        const prompts = [
            { title: t("chat.emptyState.prompts.0.title"), desc: t("chat.emptyState.prompts.0.desc"), icon: "search" },
            { title: t("chat.emptyState.prompts.1.title"), desc: t("chat.emptyState.prompts.1.desc"), icon: "clipboard-list" },
            { title: t("chat.emptyState.prompts.2.title"), desc: t("chat.emptyState.prompts.2.desc"), icon: "menu" },
            { title: t("chat.emptyState.prompts.3.title"), desc: t("chat.emptyState.prompts.3.desc"), icon: "circle-question-mark" }
        ]
        prompts.forEach((prompt) => {
            const promptEl = promptGrid.createDiv({ cls: "synapse-prompt-card__prompt" });
            const iconContainer = promptEl.createDiv({ cls: "synapse-prompt-card__prompt-icon" });
            setIcon(iconContainer, prompt.icon);
            promptEl.createDiv({ cls: "synapse-prompt-card__prompt-title", text: prompt.title });
            promptEl.createDiv({ cls: "synapse-prompt-card__prompt-desc", text: prompt.desc });
        });
    }

    private renderLogo(parent: HTMLElement): void {
        const wrap = parent.createDiv({ cls: "synapse-empty-state__logo" });
        wrap.createDiv({ cls: "synapse-empty-state__logo-img" });
    }

    private closeKebabPopover(): void {
        if (this.activePopover) {
            this.activePopover.remove();
            this.activePopover = null;
        }
        if (this.closePopoverHandler) {
            document.removeEventListener("click", this.closePopoverHandler);
            this.closePopoverHandler = null;
        }
    }

    async onClose() {
        this.clearThinkingInterval();
        this.closeKebabPopover();
        this.containerEl.empty();
    }

    private createToolbar(msgDiv: HTMLElement, contentEl: HTMLElement, id: string, sender: "user" | "ai"): void {
        const toolbar = msgDiv.createDiv({ cls: `synapse-message__toolbar` });

        const infoToolbar = toolbar.createDiv({ cls: "synapse-message__toolbar-info" });
        const msg = this.services.messageRepository.getMessage(id);
        infoToolbar.createSpan({ cls: "synapse-message__time", text: msg ? this.formatMessageMeta(msg) : new Date().toLocaleString() });

        const actionToolbar = toolbar.createDiv({ cls: "synapse-message__toolbar-actions" });

        if (sender === "ai") {

            const regenBtn = actionToolbar.createEl("button", { cls: "synapse-icon-btn", attr: { "aria-label": t("chat.actions.regenerate") } })
            setIcon(regenBtn, "refresh-cw");
            regenBtn.addEventListener("click", async () => {
                await this.handleRegenerate(id, msgDiv);
            });

            const saveBtn = actionToolbar.createEl("button", { cls: "synapse-icon-btn", attr: { "aria-label": t("chat.actions.save") } });
            setIcon(saveBtn, "save");
            saveBtn.addEventListener("click", () => {
                const content = this.services.messageRepository.getMessage(id)?.content ?? contentEl.innerText;
                void this.saveReplyAsNote(id, content);
            });

            const copyBtn = actionToolbar.createEl("button", { cls: "synapse-icon-btn", attr: { "aria-label": t("chat.actions.copy") } });
            setIcon(copyBtn, "copy");
            copyBtn.addEventListener("click", async () => {
                await navigator.clipboard.writeText(contentEl.innerText);
                new Notice(t("chat.actions.copied"));
            });

            const deleteBtn = actionToolbar.createEl("button", { cls: "synapse-icon-btn", attr: { "aria-label": t("chat.actions.delete") } });
            setIcon(deleteBtn, "trash-2");
            deleteBtn.addEventListener("click", async () => {
                this.services.messageRepository.deleteMessage(id);
                msgDiv.remove();
            });

        } else if (sender == "user") {

            const copyBtn = actionToolbar.createEl("button", { cls: "synapse-icon-btn", attr: { "aria-label": t("chat.actions.copy") } });
            setIcon(copyBtn, "copy");
            copyBtn.addEventListener("click", async () => {
                await navigator.clipboard.writeText(contentEl.innerText);
                new Notice(t("chat.actions.copied"));
            });

            const editBtn = actionToolbar.createEl("button", { cls: "synapse-icon-btn", attr: { "aria-label": t("chat.actions.edit") } })
            setIcon(editBtn, "pencil");
            editBtn.addEventListener("click", async () => {
                await this.handleEdit(id, msgDiv, contentEl);
            });

            const deleteBtn = actionToolbar.createEl("button", { cls: "synapse-icon-btn", attr: { "aria-label": t("chat.actions.delete") } });
            setIcon(deleteBtn, "trash-2");
            deleteBtn.addEventListener("click", async () => {
                this.services.messageRepository.deleteMessage(id);
                msgDiv.remove();
            });
        }

        // ПКМ-меню (дополняет тулбар) — полный набор действий по сообщению
        this.registerDomEvent(contentEl, "contextmenu", (evt: MouseEvent) => {
            evt.preventDefault();
            const sel = window.getSelection();
            const selectedText = sel?.toString().trim() ?? "";
            const hasSelection = selectedText.length > 0 && !!sel?.anchorNode && contentEl.contains(sel.anchorNode);
            const menu = new Menu();

            if (sender === "ai") {
                menu.addItem(item => item
                    .setTitle(hasSelection ? t("chat.actions.saveSelection") : t("chat.actions.save"))
                    .setIcon("save")
                    .onClick(() => {
                        const content = hasSelection ? selectedText : (this.services.messageRepository.getMessage(id)?.content ?? contentEl.innerText);
                        void this.saveReplyAsNote(id, content);
                    }));
                menu.addSeparator();
                menu.addItem(item => item
                    .setTitle(t("chat.actions.copy"))
                    .setIcon("copy")
                    .onClick(async () => {
                        await navigator.clipboard.writeText(contentEl.innerText);
                        new Notice(t("chat.actions.copied"));
                    }));
                menu.addItem(item => item
                    .setTitle(t("chat.actions.copyMarkdown"))
                    .setIcon("file-code")
                    .onClick(async () => {
                        await navigator.clipboard.writeText(this.services.messageRepository.getMessage(id)?.content ?? contentEl.innerText);
                        new Notice(t("chat.actions.copied"));
                    }));
                menu.addSeparator();
                menu.addItem(item => item
                    .setTitle(t("chat.actions.regenerate"))
                    .setIcon("refresh-cw")
                    .onClick(() => { void this.handleRegenerate(id, msgDiv); }));
                menu.addItem(item => item
                    .setTitle(t("chat.actions.delete"))
                    .setIcon("trash-2")
                    .onClick(() => {
                        this.services.messageRepository.deleteMessage(id);
                        msgDiv.remove();
                    }));
            } else {
                menu.addItem(item => item
                    .setTitle(t("chat.actions.copy"))
                    .setIcon("copy")
                    .onClick(async () => {
                        await navigator.clipboard.writeText(contentEl.innerText);
                        new Notice(t("chat.actions.copied"));
                    }));
                menu.addItem(item => item
                    .setTitle(t("chat.actions.edit"))
                    .setIcon("pencil")
                    .onClick(() => { void this.handleEdit(id, msgDiv, contentEl); }));
                menu.addItem(item => item
                    .setTitle(t("chat.actions.delete"))
                    .setIcon("trash-2")
                    .onClick(() => {
                        this.services.messageRepository.deleteMessage(id);
                        msgDiv.remove();
                    }));
            }

            menu.showAtMouseEvent(evt);
        });

    }

    private async executeInference(prompt: string): Promise<void> {
        const provider = this.services.getAIProvider(this.currentModelId || this.services.settings.defaultModel);
        const aiMessageId = this.services.messageRepository.addMessage("model", "");
        const { msgDiv: aiMsgDiv, contentEl: aiContentEl } = this.addMessage(aiMessageId, t("chat.status.thinking"), "ai");
        aiMsgDiv.addClass("is-thinking");

        const thinkingFrames = [
            t("chat.status.thinking"), 
            t("chat.status.thinking") + ".", 
            t("chat.status.thinking") + "..", 
            t("chat.status.thinking") + "..."
        ];
        let frameIndex = 0;
        this.activeThinkingInterval = window.setInterval(() => {
            frameIndex = (frameIndex + 1) % thinkingFrames.length;
            aiContentEl.setText(thinkingFrames[frameIndex] ?? (t("chat.status.thinking") + "..."));
        }, 400);

        let enhancedPrompt = prompt;
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile && activeFile.extension === "md") {
            if (this.services.settings.autoAddActiveNote) {
                const doc = this.services.documentStore.getDocument(activeFile.path);
                if (doc) {
                    enhancedPrompt = `\n\n## ${t("chat.context.activeNote")} ${activeFile.basename}\n\n${doc.content}\n\n---\n\n` + enhancedPrompt;
                }
            }
        }
        const linkRegex = /\[\[(.*?)\]\]/g;
        for (const match of prompt.matchAll(linkRegex)) {
            const linkText = match[1];
            if (!linkText) continue;
            const resolvedLink = this.app.metadataCache.getFirstLinkpathDest(linkText, activeFile?.path ?? "");
            const doc = resolvedLink ? this.services.documentStore.getDocument(resolvedLink.path) : undefined;
            const content = doc ? doc.content : null;
            if (content) {
                enhancedPrompt = enhancedPrompt.replace(match[0], `\n\n## ${linkText}\n\n${content}`);
            }
        }
        const contextualNotesBlock = this.buildContextNotesBlock(prompt, activeFile?.path);
        if (contextualNotesBlock) {
            enhancedPrompt = `${contextualNotesBlock}\n\n${enhancedPrompt}`;
        }

        try {
            const priorHistory = this.services.messageRepository.getHistory().slice(0, -2);
            const messageLimit = this.services.settings.conversationTurns * 2;
            const limitedHistory = priorHistory.slice(-messageLimit);
            const startedAt = Date.now();
            const responseStream = provider.generateChatStream(enhancedPrompt, limitedHistory, this.activeAbortController?.signal);
            let fullResponse = "";
            let isFirstChunk = true;
            for await (const chunk of responseStream) {
                if (this.activeAbortController?.signal.aborted) {
                    break;
                }
                if (isFirstChunk) { this.clearThinkingInterval(); isFirstChunk = false; }
                fullResponse += chunk;
                aiContentEl.setText(fullResponse);
                this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
            }
            this.clearThinkingInterval();

            if (isFirstChunk || !fullResponse.trim()) {
                this.services.messageRepository.deleteMessage(aiMessageId);
                aiContentEl.setText(t("chat.status.emptyResponse"));
            } else {
                this.services.messageRepository.updateMessage(aiMessageId, fullResponse);
                this.services.messageRepository.setMessageMeta(aiMessageId, { durationMs: Date.now() - startedAt });
                aiContentEl.empty();
                aiContentEl.addClass("synapse-message__content--rendered");
                MarkdownRenderer.render(this.app, fullResponse, aiContentEl, "", this);
                const updated = this.services.messageRepository.getMessage(aiMessageId);
                const timeEl = aiMsgDiv.querySelector(".synapse-message__time");
                if (updated && timeEl) timeEl.setText(this.formatMessageMeta(updated));
                this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
            }
        } catch (error) {
            this.clearThinkingInterval();
            this.services.messageRepository.deleteMessage(aiMessageId);
            this.services.logger.error("Ошибка при генерации ответа", error);
            aiContentEl.setText(t("chat.status.error"));
        } finally {
            aiMsgDiv.removeClass("is-thinking");
        }
    }

    private async handleRegenerate(aiMessageId: string, aiMsgDiv: HTMLElement): Promise<void> {
        if (this.isRequestInFlight) return;

        const history = this.services.messageRepository.getHistory();
        const aiIndex = history.findIndex(m => m.id === aiMessageId);
        if (aiIndex <= 0) {
            new Notice(t("chat.status.noPrevMessage"));
            return;
        }
        const userMessage = history[aiIndex - 1];
        if (!userMessage || userMessage.role !== "user") {
            new Notice(t("chat.status.corruptedContext"));
            return;
        }

        this.services.messageRepository.truncateFromId(aiMessageId);

        let next = aiMsgDiv.nextElementSibling;
        while (next) {
            const toRemove = next;
            next = next.nextElementSibling;
            toRemove.remove();
        }
        aiMsgDiv.remove();

        this.setGeneratingState(true);
        try {
            this.activeAbortController = new AbortController();
            await this.executeInference(userMessage.content);
        } finally {
            this.setGeneratingState(false);
        }
    }

    private async handleEdit(userMessageId: string, msgDiv: HTMLElement, contentEl: HTMLElement): Promise<void> {
        if (this.isRequestInFlight) return;


        const toolbar = msgDiv.querySelector(".synapse-message__toolbar") as HTMLElement | null;
        contentEl.hidden = true;
        if (toolbar) toolbar.style.display = "none";

        const editDiv = msgDiv.createDiv({ cls: "synapse-message__edit-container" });
        const editInput = editDiv.createEl("textarea", { cls: "synapse-message__edit-input" });
        editInput.value = contentEl.innerText;
        editInput.focus();
        const editToolbar = editDiv.createDiv({ cls: "synapse-message__edit-toolbar" });

        const cancelbtn = editToolbar.createEl("button", { cls: "synapse-icon-btn", attr: { "aria-label": t("chat.actions.cancel") } })
        setIcon(cancelbtn, "x")
        cancelbtn.addEventListener("click", () => {
            editDiv.remove();
            contentEl.hidden = false;
            if (toolbar) toolbar.style.display = "";
        })

        const sendbtn = editToolbar.createEl("button", { cls: "synapse-icon-btn", attr: { "aria-label": t("chat.actions.send") } })
        setIcon(sendbtn, "send")
        sendbtn.addEventListener("click", async () => {
            this.services.messageRepository.updateMessage(userMessageId, editInput.value)
            this.services.messageRepository.truncateAfterId(userMessageId);

            let next = msgDiv.nextElementSibling;
            while (next) {
                const toRemove = next;
                next = next.nextElementSibling;
                toRemove.remove();
            }
            editDiv.remove();

            contentEl.innerText = editInput.value;
            contentEl.hidden = false;
            if (toolbar) toolbar.style.display = "";

            this.setGeneratingState(true);
            try {
                this.activeAbortController = new AbortController();
                await this.executeInference(editInput.value);
            } finally {
                this.setGeneratingState(false);
            }
        })
    }

    private buildContextNotesBlock(query: string, activePath?: string): string {
        const maxDocs = 3;
        const searchPool = this.services.documentStore.searchByKeywords(query, maxDocs + 2);
        const filtered = searchPool
            .filter((doc) => doc.path !== activePath)
            .slice(0, maxDocs);

        if (filtered.length === 0) {
            return "";
        }

        const sections = filtered.map((doc, index) => {
            const snippet = this.makeSnippet(doc.content, 1200);
            return `### ${index + 1}. ${doc.path}\n\n${snippet}`;
        });

        return `## ${t("chat.context.relevantNotes")}\n\n${sections.join("\n\n")}\n\n---`;
    }

    private makeSnippet(content: string, maxLength: number): string {
        const normalized = content.replace(/\s+/g, " ").trim();
        if (normalized.length <= maxLength) {
            return normalized;
        }
        return `${normalized.slice(0, maxLength)}...`;
    }

    private formatMessageMeta(msg: Message): string {
        const parts: string[] = [];
        if (msg.createdAt) parts.push(new Date(msg.createdAt).toLocaleString());
        if (msg.durationMs != null) parts.push(`${(msg.durationMs / 1000).toFixed(1)}s`);
        return parts.join(" • ");
    }

    private makeNoteTitle(text: string): string {
        const cleaned = text
            .replace(/[\\/:*?"<>|\[\]#^]/g, "_")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 50)
            .trim();
        return cleaned || "Synapse Reply";
    }

    private async ensureFolderPath(folder: string): Promise<void> {
        const parts = folder.split("/");
        let current = "";
        for (const part of parts) {
            current = current ? `${current}/${part}` : part;
            const normalized = normalizePath(current);
            if (!this.app.vault.getAbstractFileByPath(normalized)) {
                await this.app.vault.createFolder(normalized);
            }
        }
    }

    private async saveReplyAsNote(id: string, content: string): Promise<void> {
        const text = content?.trim() ?? "";
        if (!text) {
            new Notice(t("chat.status.saveEmpty"));
            return;
        }

        const history = this.services.messageRepository.getHistory();
        const idx = history.findIndex(m => m.id === id);
        const prev = idx > 0 ? history[idx - 1] : undefined;
        const question = prev?.role === "user" ? prev.content.replace(/\s+/g, " ").trim() : "";

        const folder = this.services.settings.savedNotesPath?.trim() || "Synapse/Saved";
        const tag = this.services.settings.defaultTag;
        const lines: string[] = [
            "---",
            "source: Synapse Chat",
            `created: ${new Date().toISOString()}`,
        ];
        if (tag) lines.push(`tags: [${tag}]`);
        lines.push("---", "");
        if (question) lines.push(`> **${t("chat.savedNote.questionLabel")}:** ${question}`, "");
        lines.push(text, "");
        const body = lines.join("\n");

        const title = this.makeNoteTitle(question || text);
        try {
            await this.ensureFolderPath(folder);
            let filePath = normalizePath(`${folder}/${title}.md`);
            if (this.app.vault.getAbstractFileByPath(filePath)) {
                filePath = normalizePath(`${folder}/${title}-${Date.now()}.md`);
            }
            await this.app.vault.create(filePath, body);
            new Notice(t("chat.status.saved"));
        } catch (e) {
            this.services.logger.error("Save reply failed", e);
            new Notice(t("chat.status.saveFailed"));
        }
    }

    private clearThinkingInterval(): void {
        if (this.activeThinkingInterval !== null) {
            window.clearInterval(this.activeThinkingInterval);
            this.activeThinkingInterval = null;
        }
    }
}
