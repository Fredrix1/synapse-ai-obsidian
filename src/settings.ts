import SynapsePlugin from "./main";
import { App, PluginSettingTab, Setting, setIcon } from "obsidian";
import { ProviderKeysModal, CustomModelModal } from "./ui/SettingsModals";
import Sortable from "sortablejs";
import { t, setLanguage } from "./i18n";

export const PROVIDER_URLS: Record<string, string> = {
    "openrouter": "https://openrouter.ai/api/v1",
    "gemini": "https://generativelanguage.googleapis.com/v1beta/models",
};

export interface SynapseModelConfig {
    id: string;
    name: string;
    displayName?: string;
    provider: string;
    baseUrl?: string;
    apiKey?: string;
    corsBypass?: boolean;
}

export interface SynapseSettings {
    apiKey: Record<string, string>;
    defaultModel: string;
    language: string;
    autoAddActiveNote: boolean;
    autosaveChat: boolean;
    autosaveChatPath: string;
    savedNotesPath: string;
    defaultTag: string;
    debugMode: boolean;
    brandedChat: boolean;
    systemPrompt: string;

    models: SynapseModelConfig[];
    conversationTurns: number;
    proxyUrl: string;

    // Hidden Settings
    activeSettingsTab: "Basic" | "Model";

    // UI Toggles (Kebab menu)
    showSuggestedPrompts: boolean;
    showTitleBar: boolean;
}

export const DEFAULT_SETTINGS: SynapseSettings = {
    apiKey: {},
    defaultModel: "gemini-2.5-flash",
    language: window.localStorage.getItem("language") === "ru" ? "ru" : "en",
    autoAddActiveNote: false,
    autosaveChat: true,
    autosaveChatPath: "",
    savedNotesPath: "Synapse/Saved",
    defaultTag: "ai-conversations",
    debugMode: false,
    models: [],
    conversationTurns: 10,
    proxyUrl: "",
    activeSettingsTab: "Basic",
    showSuggestedPrompts: false,
    showTitleBar: false,
    brandedChat: false,
    systemPrompt: "",
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}


function deepMerge<T>(base: T, override: unknown): T {
    if (override === null || override === undefined) return base;
    if (!isPlainObject(base) || !isPlainObject(override)) return override as T;
    const out: Record<string, unknown> = { ...base };
    for (const key of Object.keys(override)) {
        out[key] = deepMerge((base as Record<string, unknown>)[key], override[key]);
    }
    return out as T;
}

export function mergeSettings(loaded: unknown): SynapseSettings {
    return deepMerge(DEFAULT_SETTINGS, loaded);
}

export class SynapseSettingsTab extends PluginSettingTab {
    plugin: SynapsePlugin;

    constructor(app: App, plugin: SynapsePlugin) {
        super(app, plugin)
        this.plugin = plugin;
    }

    display(): void {
        this.plugin.settings.models = this.plugin.settings.models.filter(Boolean);
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass("synapse-settings");
        const tabContainer = containerEl.createDiv({ cls: "synapse-tab" });
        const BasicTab = tabContainer.createSpan({ cls: `synapse-tab__btn ${this.plugin.settings.activeSettingsTab === "Basic" ? "is-active" : ""}`, text: t("settings.tabs.basic") });
        BasicTab.onclick = async () => {
            this.plugin.settings.activeSettingsTab = "Basic";
            await this.plugin.saveSettings();
            this.display();
        }
        const ModelTab = tabContainer.createSpan({ cls: `synapse-tab__btn ${this.plugin.settings.activeSettingsTab === "Model" ? "is-active" : ""}`, text: t("settings.tabs.model") });
        ModelTab.onclick = async () => {
            this.plugin.settings.activeSettingsTab = "Model";
            await this.plugin.saveSettings();
            this.display();
        }

        if (this.plugin.settings.activeSettingsTab === "Basic") {

            new Setting(containerEl).setHeading().setName(t("settings.headings.general"))
            new Setting(containerEl)
                .setName(t("settings.apiKeys.name"))
                .setDesc(t("settings.apiKeys.desc"))
                .addButton(btn => {
                    btn.setButtonText(t("settings.apiKeys.btn"));
                    const iconEl = document.createElement("span");
                    iconEl.addClass("synapse-settings__key-icon");
                    setIcon(iconEl, "key");
                    btn.buttonEl.appendChild(iconEl);
                    btn.onClick(() => {
                        new ProviderKeysModal(this.app, this.plugin, () => this.display()).open();
                    });
                });
            new Setting(containerEl)
                .setName(t("settings.defaultModel.name"))
                .setDesc(t("settings.defaultModel.desc"))
                .addDropdown(drop => {
                    this.plugin.settings.models.forEach(model => {
                        drop.addOption(model.id, model.displayName || model.name)
                    })
                    drop.setValue(this.plugin.settings.defaultModel)
                        .onChange(async (value) => {
                            this.plugin.settings.defaultModel = value;
                            await this.plugin.saveSettings();
                        })
                })
            new Setting(containerEl)
                .setName(t("settings.language.name"))
                .setDesc(t("settings.language.desc"))
                .addDropdown(drop => drop
                    .addOption("ru", "Русский")
                    .addOption("en", "English")
                    .setValue(this.plugin.settings.language)
                    .onChange(async (value) => {
                        this.plugin.settings.language = value;
                        setLanguage(value);
                        await this.plugin.saveSettings();
                        this.display();
                    })
                )
            new Setting(containerEl)
                .setName(t("settings.autoAddActiveNote.name"))
                .setDesc(t("settings.autoAddActiveNote.desc"))
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.autoAddActiveNote)
                    .onChange(async (value) => {
                        this.plugin.settings.autoAddActiveNote = value;
                        await this.plugin.saveSettings();
                    })
                )
            new Setting(containerEl)
                .setName(t("settings.systemPrompt.name"))
                .setDesc(t("settings.systemPrompt.desc"))
                .addTextArea(text => {
                    text.inputEl.addClass("synapse-settings__system-prompt");

                    text.setPlaceholder(t("settings.systemPrompt.placeholder"))
                        .setValue(this.plugin.settings.systemPrompt)
                        .onChange(async (value) => {
                            this.plugin.settings.systemPrompt = value;
                            await this.plugin.saveSettings();
                        });
                });


            new Setting(containerEl).setHeading().setName(t("settings.headings.saving"))
            new Setting(containerEl)
                .setName(t("settings.autosaveChat.name"))
                .setDesc(t("settings.autosaveChat.desc"))
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.autosaveChat)
                    .onChange(async (value) => {
                        this.plugin.settings.autosaveChat = value;
                        await this.plugin.saveSettings();
                        if (value) {
                            this.plugin.services.chatAutosaveService.start();
                        } else {
                            this.plugin.services.chatAutosaveService.stop();
                        }
                    })
                )
            new Setting(containerEl)
                .setName(t("settings.autosaveChatPath.name"))
                .setDesc(t("settings.autosaveChatPath.desc"))
                .addText((cb: any) => cb
                    .setPlaceholder(t("settings.autosaveChatPath.placeholder"))
                    .setValue(this.plugin.settings.autosaveChatPath)
                    .onChange((value: string) => {
                        this.plugin.settings.autosaveChatPath = value;
                        this.plugin.saveSettings();
                    }))
            new Setting(containerEl)
                .setName(t("settings.savedNotesPath.name"))
                .setDesc(t("settings.savedNotesPath.desc"))
                .addText((cb: any) => cb
                    .setPlaceholder(t("settings.savedNotesPath.placeholder"))
                    .setValue(this.plugin.settings.savedNotesPath)
                    .onChange((value: string) => {
                        this.plugin.settings.savedNotesPath = value;
                        this.plugin.saveSettings();
                    }))
            new Setting(containerEl)
                .setName(t("settings.defaultTag.name"))
                .setDesc(t("settings.defaultTag.desc"))
                .addText((cb: any) => cb
                    .setPlaceholder(t("settings.defaultTag.placeholder"))
                    .setValue(this.plugin.settings.defaultTag)
                    .onChange((value: string) => {
                        this.plugin.settings.defaultTag = value;
                        this.plugin.saveSettings();
                    }))

            new Setting(containerEl).setHeading().setName(t("settings.headings.developer"))
            new Setting(containerEl)
                .setName(t("settings.debugMode.name"))
                .setDesc(t("settings.debugMode.desc"))
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.debugMode)
                    .onChange(async (value) => {
                        this.plugin.settings.debugMode = value;
                        await this.plugin.saveSettings();
                    }))
            new Setting(containerEl)
                .setName(t("settings.brandedChat.name"))
                .setDesc(t("settings.brandedChat.desc"))
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.brandedChat)
                    .setDisabled(true)
                    .onChange(async (value) => {
                        this.plugin.settings.brandedChat = value;
                        await this.plugin.saveSettings();
                    }));

        } else if (this.plugin.settings.activeSettingsTab === "Model") {
            new Setting(containerEl)
                .setHeading()
                .setClass("synapse-models-heading")
                .setName(t("settings.headings.configuredModels"))
                .addButton(btn => {
                    btn.setCta();
                    btn.buttonEl.addClass("synapse-models__btn")
                    const iconEl = document.createElement("span");
                    iconEl.addClass("synapse-models__btn-icon");
                    setIcon(iconEl, "plus");
                    btn.setButtonText(t("settings.models.addBtn"));
                    btn.buttonEl.prepend(iconEl);
                    btn.onClick(async () => {
                        new CustomModelModal(this.app, this.plugin, null, () => this.display()).open();
                    });
                })

            const modelsTable = containerEl.createDiv({ cls: "synapse-models__table" });

            const headerRow = modelsTable.createDiv({ cls: "synapse-models__row synapse-models__row--header" });
            headerRow.createDiv({ cls: "synapse-models__cell synapse-models__cell--drag" });
            headerRow.createDiv({ cls: "synapse-models__cell" }).setText(t("settings.models.tableModel"));
            headerRow.createDiv({ cls: "synapse-models__cell" }).setText(t("settings.models.tableProvider"));
            headerRow.createDiv({ cls: "synapse-models__cell" }).setText(t("settings.models.tableBaseUrl"));
            headerRow.createDiv({ cls: "synapse-models__cell synapse-models__cell--actions" }).setText(t("settings.models.tableActions"));

            this.plugin.settings.models.forEach((model, index) => {
                const row = modelsTable.createDiv({ cls: "synapse-models__row" })
                const dragCell = row.createDiv({ cls: "synapse-models__cell synapse-models__cell--drag" });
                setIcon(dragCell, "grip-vertical");
                row.createDiv({ cls: "synapse-models__cell" }).setText(model.displayName || model.name)
                row.createDiv({ cls: "synapse-models__cell" }).setText(model.provider)
                row.createDiv({ cls: "synapse-models__cell" }).setText(model.baseUrl || PROVIDER_URLS[model.provider] || "")
                const actionsCell = row.createDiv({ cls: "synapse-models__cell synapse-models__cell--actions" });
                const editBtn = actionsCell.createSpan({ cls: "synapse-action-icon" });
                setIcon(editBtn, "pencil");
                editBtn.onclick = () => {
                    new CustomModelModal(this.app, this.plugin, model, () => this.display()).open();
                }
                const deleteBtn = actionsCell.createSpan({ cls: "synapse-action-icon" });
                deleteBtn.onclick = (async () => {
                    this.plugin.settings.models.splice(index, 1);
                    await this.plugin.saveSettings();
                    this.display();
                })
                setIcon(deleteBtn, "trash-2");
            })

            new Sortable(modelsTable, {
                animation: 150,
                handle: ".synapse-models__cell--drag",
                forceFallback: true,
                chosenClass: "synapse-models__row--chosen",
                ghostClass: "synapse-models__row--ghost",
                dragClass: "synapse-models__row--drag",
                onEnd: async (evt) => {
                    const oldIdx = evt.oldIndex! - 1;
                    const newIdx = evt.newIndex! - 1;
                    if (oldIdx < 0 || newIdx < 0 || oldIdx === newIdx) return;

                    const moved = this.plugin.settings.models.splice(oldIdx, 1)[0];
                    if (!moved) return;
                    this.plugin.settings.models.splice(newIdx, 0, moved);
                    await this.plugin.saveSettings();
                }
            })


            new Setting(containerEl)
                .setHeading()
                .setName(t("settings.headings.context"))

            new Setting(containerEl)
                .setName(t("settings.conversationTurns.name"))
                .setDesc(t("settings.conversationTurns.desc"))
                .addSlider(slider => slider
                    .setLimits(1, 30, 1)
                    .setValue(this.plugin.settings.conversationTurns)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.conversationTurns = value;
                        await this.plugin.saveSettings();
                    })
                )

            new Setting(containerEl)
                .setName(t("settings.proxyUrl.name"))
                .setDesc(t("settings.proxyUrl.desc"))
                .addText(text => text
                    .setPlaceholder(t("settings.proxyUrl.placeholder"))
                    .setValue(this.plugin.settings.proxyUrl)
                    .onChange(async (value) => {
                        this.plugin.settings.proxyUrl = value;
                        await this.plugin.saveSettings();
                    }))
        }

    }
}