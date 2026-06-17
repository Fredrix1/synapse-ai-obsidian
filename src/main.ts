import { Plugin, Notice } from 'obsidian';
import { ChatView, VIEW_TYPE_CHAT } from "./views/ChatView";
import { SynapseSettings, SynapseSettingsTab, mergeSettings } from "./settings";
import { ServiceContainer } from "./services/ServiceContainer";
import { AppLifecycleService } from "./services/AppLifecycleService";
import { setLanguage } from "./i18n";

export default class SynapsePlugin extends Plugin {
	settings: SynapseSettings;
	public services!: ServiceContainer;

	async onload() {
		this.settings = mergeSettings(await this.loadData());
		setLanguage(this.settings.language);
		const lifecycle = new AppLifecycleService(this.app, this.settings);
		this.services = lifecycle.createServices();
		this.services.logger.info("Synapse AI Loaded!");
		lifecycle.startBackgroundIndexing(this.services.documentStore, this.services.logger);
		this.registerView(VIEW_TYPE_CHAT, (leaf) => new ChatView(leaf, this.services, this));
		this.addSettingTab(new SynapseSettingsTab(this.app, this));

		this.addCommand({
			id: "synapse-export-logs",
			name: "Synapse: Export logs",
			checkCallback: (checking: boolean) => {
				if (this.settings.debugMode) {
					if (!checking) {
						this.services.logger.exportLog(this.app).then(() => {
							new Notice("Logs exported to .Synapse/Synapse-logs/");
						});
					}
					return true;
				}
				return false;
			}
		})

		this.addCommand({
			id: "synapse-open-chat",
			name: "Synapse: Open Chat",
			callback: () => {
				this.activateView();
			}
		})
		
		this.addCommand({
			id: "synapse-save-chat",
			name: "Synapse: Save chat now",
			callback: () => {
				this.services.chatAutosaveService.saveNow();
				new Notice("Chat saved!");
			}
		})
	}

	async saveSettings() {
		await this.saveData(this.settings);
		(this.app.workspace as any).trigger("synapse:setting-updated");
	}

	onunload() {
		if (this.services && this.services.logger) {
			this.services.logger.info("Synapse AI Unloaded!");
		}
		void this.services?.dispose();
	}

	async activateView() {
		const leaf = this.app.workspace.getRightLeaf(false);
		if (leaf) {
			await leaf.setViewState({
				type: VIEW_TYPE_CHAT,
				active: true,
			});
		}
	}

}
