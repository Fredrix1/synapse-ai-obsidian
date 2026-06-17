import { App, Modal, Setting, TextComponent, Notice, setIcon, requestUrl } from "obsidian";
import SynapsePlugin from "../main"
import { SynapseModelConfig, PROVIDER_URLS } from "../settings";
import { t } from "../i18n";

export class ProviderKeysModal extends Modal {
    plugin: SynapsePlugin;
    onUpdate?: () => void;

    constructor(app: App, plugin: SynapsePlugin, onUpdate?: () => void) {
        super(app);
        this.plugin = plugin;
        this.onUpdate = onUpdate;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h2", { text: t("settings.modals.providerKeys.title") });
        contentEl.createEl("p", { text: t("settings.modals.providerKeys.subtitle"), cls: "synapse-provider__subtitle" });
        contentEl.createEl("p", { text: t("settings.modals.providerKeys.text"), cls: "synapse-provider__text" });

        let openRouterAccordion: HTMLDivElement;
        let geminiAccordion: HTMLDivElement;
        let openRouterInput: HTMLInputElement;
        let geminiInput: HTMLInputElement;
        let orDropdown: HTMLSelectElement;
        let gDropdown: HTMLSelectElement;
        let orAddBtn: HTMLButtonElement;
        let gAddBtn: HTMLButtonElement;

        const openRouterSetting = new Setting(contentEl)
            .setName("OpenRouter")
            .setClass("synapse-provider__row")
            .addButton(btn => {
                btn.setButtonText(t("settings.modals.providerKeys.addModel"));
                btn.buttonEl.addClass("synapse-provider__add-model-btn")
                btn.buttonEl.disabled = true;
                const chevron = btn.buttonEl.createEl("span");
                setIcon(chevron, "chevron-down");
                btn.onClick(async () => {
                    if (openRouterAccordion.style.display === "none") {
                        openRouterAccordion.show();
                        setIcon(chevron, "chevron-up");

                        if (orDropdown.options.length <= 1) {
                            let i = 0
                            const loadingText = t("settings.modals.providerKeys.loading");
                            const dots = [loadingText, loadingText + ".", loadingText + "..", loadingText + "..."];
                            openRouterStatus.setText(dots[0]!);
                            const timer = setInterval(() => {
                                i = (i + 1) % 4;
                                openRouterStatus.setText(dots[i]!);
                            }, 500);
                            try {
                                const key = this.plugin.settings.apiKey["openrouter"];
                                const res = await fetch("https://openrouter.ai/api/v1/models", {
                                    headers: { "Authorization": `Bearer ${key}` }
                                });
                                const json = await res.json();

                                json.data.forEach((model: { id: string, name: string }) => {
                                    orDropdown.add(new Option(model.name, model.id));
                                });
                                orDropdown.disabled = false;

                                clearInterval(timer);
                                openRouterStatus.hide();
                            } catch (e) {
                                clearInterval(timer);
                                openRouterStatus.setText(t("settings.modals.providerKeys.errorFormat"));
                            }
                        }
                    } else {
                        openRouterAccordion.hide();
                        setIcon(chevron, "chevron-down");
                    }
                });
            });

        const orWrapper = openRouterSetting.controlEl.createDiv({ cls: "synapse-provider__input-wrapper" });
        openRouterInput = orWrapper.createEl("input", { cls: "synapse-provider__input" });
        openRouterInput.type = "password";
        openRouterInput.placeholder = "";
        openRouterInput.addEventListener("input", async () => {
            const addBtn = openRouterSetting.controlEl.querySelector("button") as HTMLButtonElement;
            if (addBtn) addBtn.disabled = openRouterInput.value.trim() === "";
            this.plugin.settings.apiKey["openrouter"] = openRouterInput.value.trim();
            await this.plugin.saveSettings();
        });
        openRouterInput.value = this.plugin.settings.apiKey["openrouter"] ?? "";
        const addBtnOR = openRouterSetting.controlEl.querySelector("button") as HTMLButtonElement;
        if (addBtnOR) addBtnOR.disabled = openRouterInput.value.trim() === "";
        const orEyeBtn = orWrapper.createEl("button", { cls: "synapse-provider__eye-btn" });
        setIcon(orEyeBtn, "eye");
        orEyeBtn.addEventListener("click", () => {
            if (openRouterInput.type === "password") {
                openRouterInput.type = "text";
                setIcon(orEyeBtn, "eye-off");
            } else {
                openRouterInput.type = "password";
                setIcon(orEyeBtn, "eye");
            }
        });
        openRouterSetting.controlEl.prepend(orWrapper);

        contentEl.createEl("a", {
            text: t("settings.modals.providerKeys.getOrKey"),
            href: "https://openrouter.ai/workspaces/default/keys",
            cls: "synapse-provider__row-a"
        }, link => { link.target = "_blank" });

        openRouterAccordion = contentEl.createDiv({ cls: "synapse-provider__accordion" });
        openRouterAccordion.hide();
        const orAccordionSetting = new Setting(openRouterAccordion)
            .setName(t("settings.modals.providerKeys.modelName"))
            .setClass("synapse-provider__accordion-row")
            .setDesc(t("settings.modals.providerKeys.modelDesc"))
            .addDropdown(drop => {
                orDropdown = drop.selectEl
                drop.selectEl.disabled = true;
                drop.addOption("", t("settings.modals.providerKeys.selectModel"));
                drop.selectEl.addEventListener("change", () => {
                    orAddBtn.disabled = drop.selectEl.value === "";
                });
            })
            .addButton(btn => {
                btn.setButtonText(t("settings.modals.providerKeys.addBtn"));
                orAddBtn = btn.buttonEl;
                btn.buttonEl.disabled = true;
                btn.onClick(async () => {
                    const selectId = orDropdown.value;
                    const selectedName = orDropdown.options[orDropdown.selectedIndex]?.text ?? selectId;
                    if (!selectId) return;

                    this.plugin.settings.models.push({
                        id: crypto.randomUUID(),
                        name: selectId,
                        displayName: selectedName,
                        provider: "openrouter",
                        baseUrl: "https://openrouter.ai/api/v1"
                    });
                    await this.plugin.saveSettings();
                    this.onUpdate?.();
                });
            });
        const openRouterStatus = openRouterAccordion.createDiv({ cls: "synapse-provider__status", text: t("settings.modals.providerKeys.loading") + "..." });

        const geminiSetting = new Setting(contentEl)
            .setName("Gemini")
            .setClass("synapse-provider__row")
            .addButton(btn => {
                btn.setButtonText(t("settings.modals.providerKeys.addModel"));
                btn.buttonEl.addClass("synapse-provider__add-model-btn")
                btn.buttonEl.disabled = true;
                const chevron = btn.buttonEl.createEl("span");
                setIcon(chevron, "chevron-down");
                btn.onClick(async () => {
                    if (geminiAccordion.style.display === "none") {
                        geminiAccordion.show();
                        setIcon(chevron, "chevron-up");

                        if (gDropdown.options.length <= 1) {
                            let i = 0
                            const loadingText = t("settings.modals.providerKeys.loading");
                            const dots = [loadingText, loadingText + ".", loadingText + "..", loadingText + "..."];
                            geminiStatus.setText(dots[0]!);
                            const timer = setInterval(() => {
                                i = (i + 1) % 4;
                                geminiStatus.setText(dots[i]!);
                            }, 500);
                            try {
                                const key = this.plugin.settings.apiKey["gemini"];
                                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
                                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                                const json = await res.json();

                                json.models.forEach((model: { name: string, displayName: string }) => {
                                    gDropdown.add(new Option(model.displayName, model.name));
                                });
                                gDropdown.disabled = false;

                                clearInterval(timer);
                                geminiStatus.hide();
                            } catch (e) {
                                clearInterval(timer);
                                geminiStatus.setText(t("settings.modals.providerKeys.errorFormat"));
                            }
                        }
                    } else {
                        geminiAccordion.hide();
                        setIcon(chevron, "chevron-down");
                    }
                });
            });

        const gWrapper = geminiSetting.controlEl.createDiv({ cls: "synapse-provider__input-wrapper" });
        geminiInput = gWrapper.createEl("input", { cls: "synapse-provider__input" });
        geminiInput.type = "password";
        geminiInput.placeholder = "";
        geminiInput.addEventListener("input", async () => {
            const addBtn = geminiSetting.controlEl.querySelector("button") as HTMLButtonElement;
            if (addBtn) addBtn.disabled = geminiInput.value.trim() === "";
            this.plugin.settings.apiKey["gemini"] = geminiInput.value.trim();
            await this.plugin.saveSettings();
        });
        geminiInput.value = this.plugin.settings.apiKey["gemini"] ?? "";
        const addBtnG = geminiSetting.controlEl.querySelector("button") as HTMLButtonElement;
        if (addBtnG) addBtnG.disabled = geminiInput.value.trim() === "";
        const gEyeBtn = gWrapper.createEl("button", { cls: "synapse-provider__eye-btn" });
        setIcon(gEyeBtn, "eye");
        gEyeBtn.addEventListener("click", () => {
            if (geminiInput.type === "password") {
                geminiInput.type = "text";
                setIcon(gEyeBtn, "eye-off");
            } else {
                geminiInput.type = "password";
                setIcon(gEyeBtn, "eye");
            }
        });
        geminiSetting.controlEl.prepend(gWrapper);

        contentEl.createEl("a", {
            text: t("settings.modals.providerKeys.getGeminiKey"),
            href: "https://aistudio.google.com/app/api-keys",
            cls: "synapse-provider__row-a"
        }, link => { link.target = "_blank" });

        geminiAccordion = contentEl.createDiv({ cls: "synapse-provider__accordion" });
        geminiAccordion.hide();
        new Setting(geminiAccordion)
            .setName(t("settings.modals.providerKeys.modelName"))
            .setClass("synapse-provider__accordion-row")
            .setDesc(t("settings.modals.providerKeys.modelDesc"))
            .addDropdown(drop => {
                gDropdown = drop.selectEl
                drop.selectEl.disabled = true;
                drop.addOption("", t("settings.modals.providerKeys.selectModel"));
                drop.selectEl.addEventListener("change", () => {
                    gAddBtn.disabled = drop.selectEl.value === "";
                });
            })
            .addButton(btn => {
                btn.setButtonText(t("settings.modals.providerKeys.addBtn"));
                gAddBtn = btn.buttonEl;
                btn.buttonEl.disabled = true;
                btn.onClick(async () => {
                    const selectId = gDropdown.value;
                    const selectedName = gDropdown.options[gDropdown.selectedIndex]?.text ?? selectId;
                    if (!selectId) return;

                    this.plugin.settings.models.push({
                        id: crypto.randomUUID(),
                        name: selectId,
                        displayName: selectedName,
                        provider: "gemini",
                        baseUrl: "https://generativelanguage.googleapis.com"
                    });
                    await this.plugin.saveSettings();
                    this.onUpdate?.();
                });
            });
        const geminiStatus = geminiAccordion.createDiv({ cls: "synapse-provider__status", text: t("settings.modals.providerKeys.loading") + "..." });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export class CustomModelModal extends Modal {
    plugin: SynapsePlugin;
    modelToEdit: SynapseModelConfig | null;
    onSave?: () => void;

    tempName = "";
    tempDisplayName = "";
    tempProvider = "openrouter";
    tempBaseURL = "";
    tempApiKey = "";
    tempCorsBypass = false;

    constructor(app: App, plugin: SynapsePlugin, modelToEdit: SynapseModelConfig | null = null, onSave?: () => void) {
        super(app);
        this.plugin = plugin
        this.modelToEdit = modelToEdit;
        this.onSave = onSave;
    }

    onOpen() {
        if (this.modelToEdit) {
            this.tempName = this.modelToEdit.name;
            this.tempDisplayName = this.modelToEdit.displayName || "";
            this.tempProvider = this.modelToEdit.provider;
            this.tempBaseURL = this.modelToEdit.baseUrl || "";
            this.tempApiKey = this.modelToEdit.apiKey || "";
            this.tempCorsBypass = this.modelToEdit.corsBypass || false;
        }

        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass("synapse-custom-model");
        if (this.modelToEdit) contentEl.addClass("synapse-custom-model--edit")
        contentEl.createEl("h2", { text: this.modelToEdit ? `${t("settings.modals.customModel.titleEdit")} - ${this.modelToEdit.name}` : t("settings.modals.customModel.titleAdd") });
        contentEl.createEl("p", { text: t("settings.modals.customModel.subtitle"), cls: "synapse-custom-model__subtitle" });
        let baseUrlInput!: TextComponent;
        let apiInput!: HTMLInputElement;

        const nameSetting = new Setting(contentEl)
            .addText(text => text
                .setPlaceholder(t("settings.modals.customModel.namePlaceholder"))
                .setValue(this.tempName)
                .onChange(value => this.tempName = value)
            )
        nameSetting.nameEl.empty();
        nameSetting.nameEl.appendText(t("settings.modals.customModel.name") + " ");
        nameSetting.nameEl.createSpan({ text: "*", cls: "synapse-required-asterisk" });

        const displaySetting = new Setting(contentEl)
            .setName(t("settings.modals.customModel.displayName"))
            .addText(text => text
                .setPlaceholder(t("settings.modals.customModel.displayPlaceholder"))
                .setValue(this.tempDisplayName)
                .onChange(value => this.tempDisplayName = value)
            )

        const providerSetting = new Setting(contentEl)
            .setName(t("settings.modals.customModel.provider"))
            .addDropdown(drop => {
                Object.keys(PROVIDER_URLS).forEach(p => drop.addOption(p, p));
                drop.setValue(this.tempProvider)
                    .onChange(value => {
                        this.tempProvider = value
                        baseUrlInput.setPlaceholder(PROVIDER_URLS[value] ?? "")

                        const globalKey = this.plugin.settings.apiKey[value.toLowerCase()] ?? "";
                        this.tempApiKey = globalKey;
                        apiInput.value = globalKey;
                    })
            })
        if (this.modelToEdit) providerSetting.setDisabled(true);

        const baseUrlSetting = new Setting(contentEl)
            .setName(t("settings.modals.customModel.baseUrl"))
            .setDesc(t("settings.modals.customModel.baseUrlDesc"))
            .addText(text => baseUrlInput = text
                .setValue(this.modelToEdit ? "" : this.tempBaseURL)
                .onChange(value => this.tempBaseURL = value)
            )
        baseUrlInput.setPlaceholder(this.modelToEdit ? (this.modelToEdit.baseUrl || PROVIDER_URLS[this.tempProvider] || "") : (PROVIDER_URLS[this.tempProvider] ?? ""));

        const apiKeySetting = new Setting(contentEl)
            .setName(t("settings.modals.customModel.apiKey"))

        const apiWrapper = apiKeySetting.controlEl.createDiv({ cls: "synapse-provider__input-wrapper" });
        apiInput = apiWrapper.createEl("input", { cls: "synapse-provider__input" });
        apiInput.type = "password";
        apiInput.value = this.tempApiKey || (this.plugin.settings.apiKey[this.tempProvider.toLowerCase()] ?? ""); this.tempApiKey = apiInput.value;
        apiInput.addEventListener("input", () => {
            this.tempApiKey = apiInput.value;
        });
        const apiEyeBtn = apiWrapper.createEl("button", { cls: "synapse-provider__eye-btn" });
        setIcon(apiEyeBtn, "eye");
        apiEyeBtn.addEventListener("click", () => {
            if (apiInput.type === "password") {
                apiInput.type = "text";
                setIcon(apiEyeBtn, "eye-off");
            } else {
                apiInput.type = "password";
                setIcon(apiEyeBtn, "eye");
            }
        });

        const actionsSetting = new Setting(contentEl)
            .setClass("synapse-custom-model__actions")
        if (!this.modelToEdit) {
            const corsLabel = actionsSetting.controlEl.createEl("label", {
                text: " " + t("settings.modals.customModel.cors"),
                cls: "synapse-custom-model__cors-label",
            });
            const corsCheckbox = corsLabel.createEl("input", { type: "checkbox" });
            corsLabel.prepend(corsCheckbox);
            corsCheckbox.checked = this.tempCorsBypass;
            corsCheckbox.addEventListener("change", () => {
                this.tempCorsBypass = corsCheckbox.checked;
            });
            actionsSetting.addButton(btn => {
                btn.setButtonText(t("settings.modals.customModel.curlBtn"));
                btn.onClick(() => {
                    if (!this.tempName.trim()) {
                        new Notice(t("settings.modals.customModel.notices.nameRequired"));
                        return;
                    }
                    if (!this.tempApiKey.trim()) {
                        new Notice(t("settings.modals.customModel.notices.apiRequired"));
                        return;
                    }
                    const effectiveUrl = this.tempBaseURL || PROVIDER_URLS[this.tempProvider] || "";
                    const isGemini = effectiveUrl.includes("generativelanguage.googleapis.com");
                    let curl: string;
                    if (isGemini) {
                        curl = `curl --request POST '${effectiveUrl}/${this.tempName}:generateContent?key=${this.tempApiKey}' \\\n  --header 'Content-Type: application/json' \\\n  --data-raw '{"contents":[{"parts":[{"text":"Hello!"}]}]}'`;
                    } else {
                        curl = `curl --request POST '${effectiveUrl}/chat/completions' \\\n  --header 'Content-Type: application/json' \\\n  --header 'Authorization: Bearer ${this.tempApiKey}' \\\n  --header 'HTTP-Referer: https://obsidian.md' \\\n  --header 'X-Title: Synapse' \\\n  --data-raw '{"model":"${this.tempName}","messages":[{"role":"user","content":"Hello!"}],"stream":false,"max_tokens":64}'`;
                    }
                    navigator.clipboard.writeText(curl);
                    new Notice(t("settings.modals.customModel.notices.curlCopied"));
                });
            })
            actionsSetting.addButton(btn => {
                btn.setButtonText(t("settings.modals.customModel.testBtn"));
                const statusSpan = createEl("span", { cls: "synapse-custom-model__status-icon" });
                btn.buttonEl.parentElement!.insertBefore(statusSpan, btn.buttonEl);
                btn.onClick(async () => {
                    if (!this.tempName.trim()) {
                        new Notice(t("settings.modals.customModel.notices.nameRequired"));
                        return;
                    }
                    if (!this.tempApiKey.trim()) {
                        new Notice(t("settings.modals.customModel.notices.apiRequired"));
                        return;
                    }

                    statusSpan.empty();

                    btn.setIcon("loader")
                    btn.setDisabled(true)

                    const effectiveUrl = this.tempBaseURL || PROVIDER_URLS[this.tempProvider] || "";
                    const isGemini = effectiveUrl.includes("generativelanguage.googleapis.com");

                    try {
                        let statusCode = 200;
                        let responseText = "";

                        let reqUrl = "";
                        let reqHeaders: Record<string, string> = { "Content-type": "application/json" };
                        let reqBody = "";

                        if (isGemini) {
                            reqUrl = `${effectiveUrl}/${this.tempName}:generateContent?key=${this.tempApiKey}`;
                            reqBody = JSON.stringify({ contents: [{ parts: [{ text: "Hello!" }] }] });
                        } else {
                            reqUrl = `${effectiveUrl}/chat/completions`;
                            reqHeaders["Authorization"] = `Bearer ${this.tempApiKey}`;
                            if (effectiveUrl.includes("openrouter.ai")) {
                                reqHeaders["HTTP-Referer"] = "https://obsidian.md";
                                reqHeaders["X-Title"] = "Synapse";
                            }
                            reqBody = JSON.stringify({
                                model: this.tempName,
                                messages: [{ role: "user", content: "Hello!" }],
                                stream: false,
                                max_tokens: 64
                            });
                        }

                        if (this.tempCorsBypass) {
                            this.plugin.services.logger.debug("Test: requestUrl CORS Bypass");

                            const req = await requestUrl({
                                url: reqUrl,
                                method: "POST",
                                headers: reqHeaders,
                                body: reqBody
                            });

                            statusCode = req.status;
                            responseText = req.text;

                            if (statusCode >= 400) {
                                throw new Error(`HTTP ${statusCode}: ${responseText}`);
                            }
                        } else {
                            this.plugin.services.logger.debug("Test: standard fetch");

                            const res = await fetch(reqUrl, {
                                method: "POST",
                                headers: reqHeaders,
                                body: reqBody
                            });

                            statusCode = res.status;
                            if (!res.ok) {
                                responseText = await res.text();
                                throw new Error(`HTTP ${statusCode}: ${responseText}`);
                            }
                        }

                        setIcon(statusSpan, "check-circle");
                        statusSpan.classList.remove("synapse-custom-model__status-icon--error");
                        statusSpan.classList.add("synapse-custom-model__status-icon--success");
                        new Notice(t("settings.modals.customModel.notices.success"));

                    } catch (err: any) {
                        this.plugin.services.logger.error("Synapse failed", err);
                        setIcon(statusSpan, "x-circle");
                        statusSpan.classList.remove("synapse-custom-model__status-icon--success");
                        statusSpan.classList.add("synapse-custom-model__status-icon--error");


                        if (err.message.includes("Failed to fetch") && !this.tempCorsBypass) {
                            new Notice(t("settings.modals.customModel.notices.corsWarning"), 5000);
                        } else {
                            new Notice(t("settings.modals.customModel.notices.testFailed") + err.message);
                        }
                    } finally {
                        btn.setButtonText(t("settings.modals.customModel.testBtn"))
                        btn.setDisabled(false)
                    }
                })
            })
        }
        actionsSetting.addButton(btn => {
            btn.setCta();
            btn.setButtonText(this.modelToEdit ? t("settings.modals.customModel.closeBtn") : t("settings.modals.customModel.addBtn"));
            btn.onClick(async () => {
                if (!this.modelToEdit && this.tempName.trim() === "") {
                    new Notice(t("settings.modals.customModel.notices.nameRequired"));
                    return;
                }
                if (this.modelToEdit) {
                    const idx = this.plugin.settings.models.findIndex(m => m.id === this.modelToEdit!.id);
                    if (idx !== -1) {
                        const m = this.plugin.settings.models[idx]!;
                        m.displayName = this.tempDisplayName || undefined;
                        m.baseUrl = this.tempBaseURL || this.modelToEdit.baseUrl || undefined;
                        m.apiKey = this.tempApiKey || undefined;
                        m.corsBypass = this.tempCorsBypass;

                    }
                } else {
                    this.plugin.settings.models.push({
                        id: crypto.randomUUID(),
                        name: this.tempName.trim(),
                        displayName: this.tempDisplayName || undefined,
                        provider: this.tempProvider,
                        baseUrl: this.tempBaseURL || undefined,
                        apiKey: this.tempApiKey || undefined,
                        corsBypass: this.tempCorsBypass,
                    });
                }
                await this.plugin.saveSettings();
                this.close();
                this.onSave?.();
            })
        })
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
