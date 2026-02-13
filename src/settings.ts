import { App, PluginSettingTab, Setting, setIcon } from "obsidian";
import HelloWorldPlugin from "./main";
import { FolderSuggest } from "./ui/folderSuggest";

export type SortOrder = "asc" | "desc";

export interface HelloWorldPluginSettings {
	indexPrefix: string;
	indexDisplayFormat: string;
	sortOrder: SortOrder;
	ignoredFolders: string[];
}

export const DEFAULT_SETTINGS: HelloWorldPluginSettings = {
	indexPrefix: "Index - ",
	indexDisplayFormat: "📁 {name}",
	sortOrder: "asc",
	ignoredFolders: []
};

export class HelloWorldPluginSettingTab extends PluginSettingTab {
	plugin: HelloWorldPlugin;

	constructor(app: App, plugin: HelloWorldPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Index prefix")
			.setDesc("Files starting with this prefix are treated as index files")
			.addText(text => text
				.setPlaceholder("Index - ")
				.setValue(this.plugin.settings.indexPrefix)
				.onChange(async (value) => {
					this.plugin.settings.indexPrefix = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Index display format")
			.setDesc("How nested index links appear. Use {name} for the index name without prefix.")
			.addText(text => text
				.setPlaceholder("📁 {name}")
				.setValue(this.plugin.settings.indexDisplayFormat)
				.onChange(async (value) => {
					this.plugin.settings.indexDisplayFormat = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Sort order")
			.setDesc("How to sort files in the index list")
			.addDropdown(dropdown => dropdown
				// eslint-disable-next-line obsidianmd/ui/sentence-case
				.addOption("asc", "A to Z")
				// eslint-disable-next-line obsidianmd/ui/sentence-case
				.addOption("desc", "Z to A")
				.setValue(this.plugin.settings.sortOrder)
				.onChange(async (value) => {
					this.plugin.settings.sortOrder = value as SortOrder;
					await this.plugin.saveSettings();
				}));

		// Ignored folders section with inline input
		let inputEl: HTMLInputElement;
		new Setting(containerEl)
			.setName("Ignored folders")
			.setDesc("Folders to exclude from indexing")
			.addText(text => {
				inputEl = text.inputEl;
				text.setPlaceholder("Type folder name...");
				new FolderSuggest(this.app, inputEl);
			})
			.addButton(btn => btn
				.setButtonText("Add")
				.onClick(async () => {
					const value = inputEl.value.trim();
					if (value && !this.plugin.settings.ignoredFolders.includes(value)) {
						this.plugin.settings.ignoredFolders.push(value);
						await this.plugin.saveSettings();
						inputEl.value = "";
						this.display();
					}
				}));

		// Folder list below the setting
		if (this.plugin.settings.ignoredFolders.length > 0) {
			const listContainer = containerEl.createDiv("ignored-folders-list");
			for (const folder of this.plugin.settings.ignoredFolders) {
				const folderEl = listContainer.createDiv("ignored-folder-item");
				folderEl.createSpan({ text: folder, cls: "ignored-folder-name" });
				
				const removeBtn = folderEl.createEl("button", { 
					cls: "ignored-folder-remove clickable-icon" 
				});
				setIcon(removeBtn, "trash-2");
				removeBtn.addEventListener("click", () => {
					this.plugin.settings.ignoredFolders = 
						this.plugin.settings.ignoredFolders.filter(f => f !== folder);
					void this.plugin.saveSettings().then(() => {
						this.display();
					});
				});
			}
		}
	}
}
