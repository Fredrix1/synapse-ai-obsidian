import { App } from "obsidian";
import { SynapseSettings } from "../settings";
import { err2String } from "../errorFormat";

export class LoggerService {
    private buffer: string[] = [];
    private readonly MAX_LINES = 500;

    constructor(private getSettings: () => SynapseSettings) {}

    private push(level: string, message: string) {
        if (this.getSettings().debugMode) {
            const d = new Date();
            const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
            const paddedLevel = level.padEnd(5);
            const entry = `[${time}] [${paddedLevel}] ${message}`;
            this.buffer.push(entry);

            if (this.buffer.length >= this.MAX_LINES) {
                this.buffer.shift();
            }

            if (level === "ERROR") {
                console.error(entry);
            } else if (level === "WARN") {
                console.warn(entry);
            } else if (level === "DEBUG") {
                console.debug(entry);
            } else {
                console.info(entry);
            }
        }
    }

    public debug(msg: string) { this.push("DEBUG", msg); }
    public info(msg: string) { this.push("INFO", msg); }
    public warn(msg: string) { this.push("WARN", msg); }

    public error(msg: string, err?: unknown) {
        let errMsg = msg;
        if ( err !== undefined) {
            errMsg += "\n" + err2String(err, true);
        }
        this.push("ERROR", errMsg);
    }

    public async exportLog(app: App) {
        if (this.buffer.length === 0) return;

        const content = this.buffer.join('\n');
        const fileName = `Synapse-log-${Date.now()}.md`;
        
        const rootFolder = ".Synapse";
        if (!app.vault.getAbstractFileByPath(rootFolder)) {
            await app.vault.createFolder(rootFolder);
        }

        const logsFolder = `${rootFolder}/Synapse-logs`;
        if (!app.vault.getAbstractFileByPath(logsFolder)) {
            await app.vault.createFolder(logsFolder);
        }

        const filePath = `${logsFolder}/${fileName}`;
        await app.vault.create(filePath, content);
    }
}