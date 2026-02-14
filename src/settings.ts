import { App, PluginSettingTab, Setting, setIcon } from "obsidian";
import type HelloWorldPlugin from "./main";
import { FolderSuggest } from "./ui/folderSuggest";

export type SortOrder = "asc" | "desc";

export interface FrontmatterAttribute {
	key: string;
	value: string;
}

export interface HelloWorldPluginSettings {
	autoUpdateIndexes?: boolean;
	indexIdentifier: string;
	indexFilePattern?: string;
	indexDisplayFormat?: string;
	displayStripPattern?: string;
	sortEnabled?: boolean;
	sortOrder?: SortOrder;
	ignoredFolders?: string[];
	frontmatterAttributes?: FrontmatterAttribute[];
}

export const DEFAULT_SETTINGS: HelloWorldPluginSettings = {
	autoUpdateIndexes: true,
	indexIdentifier: "^\\d{2} - ",
	indexFilePattern: "00 - {folderName}",
	indexDisplayFormat: "📁 {name}",
	displayStripPattern: "^\\d{2} - ",
	sortEnabled: true,
	sortOrder: "asc",
	ignoredFolders: [],
	frontmatterAttributes: []
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
			.setName("Auto-update indexes")
			.setDesc("Automatically update indexes when files or folders are created, deleted, or renamed")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoUpdateIndexes ?? true)
				.onChange(async (value) => {
					this.plugin.settings.autoUpdateIndexes = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Index identifier")
			.setDesc("Regex pattern to identify index files (e.g., ^\\d{2} - matches '01 - ').")
			.addText(text => text
				.setPlaceholder("^\\d{2} - ")
				.setValue(this.plugin.settings.indexIdentifier)
				.onChange(async (value) => {
					this.plugin.settings.indexIdentifier = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Index file pattern")
			.setDesc("Pattern for new index filenames. Use {folderName} for the folder name.")
			.addText(text => text
				.setPlaceholder("00 - {folderName}")
				.setValue(this.plugin.settings.indexFilePattern ?? "00 - {folderName}")
				.onChange(async (value) => {
					this.plugin.settings.indexFilePattern = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Index display format")
			.setDesc("How nested index links appear. Use {name} for the index name.")
			.addText(text => text
				.setPlaceholder("📁 {name}")
				.setValue(this.plugin.settings.indexDisplayFormat ?? "📁 {name}")
				.onChange(async (value) => {
					this.plugin.settings.indexDisplayFormat = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Display strip pattern")
			.setDesc("Regex pattern to strip from display names (leave empty to show full name).")
			.addText(text => text
				.setPlaceholder("^\\d{2} - ")
				.setValue(this.plugin.settings.displayStripPattern ?? "")
				.onChange(async (value) => {
					this.plugin.settings.displayStripPattern = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Sort")
			.setDesc("Sort files in the index list")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.sortEnabled ?? true)
				.onChange(async (value) => {
					this.plugin.settings.sortEnabled = value;
					await this.plugin.saveSettings();
				}))
			.addDropdown(dropdown => dropdown
				// eslint-disable-next-line obsidianmd/ui/sentence-case
				.addOption("asc", "A to Z")
				// eslint-disable-next-line obsidianmd/ui/sentence-case
				.addOption("desc", "Z to A")
				.setValue(this.plugin.settings.sortOrder ?? "asc")
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
					const ignoredFolders = this.plugin.settings.ignoredFolders ?? [];
					if (value && !ignoredFolders.includes(value)) {
						this.plugin.settings.ignoredFolders = [...ignoredFolders, value];
						await this.plugin.saveSettings();
						inputEl.value = "";
						this.display();
					}
				}));

		// Folder list below the setting
		const ignoredFolders = this.plugin.settings.ignoredFolders ?? [];
		if (ignoredFolders.length > 0) {
			const listContainer = containerEl.createDiv("settings-item-list");
			for (const [index, folder] of ignoredFolders.entries()) {
				const folderEl = listContainer.createDiv("settings-item-list-item");
				
				const textInput = folderEl.createEl("input", {
					type: "text",
					cls: "settings-item-list-input",
					value: folder
				});
				new FolderSuggest(this.app, textInput);
				textInput.addEventListener("change", () => {
					const newVal = textInput.value.trim();
					if (newVal) {
						const folders = this.plugin.settings.ignoredFolders ?? [];
						folders[index] = newVal;
						this.plugin.settings.ignoredFolders = folders;
						void this.plugin.saveSettings();
					}
				});
				
				const removeBtn = folderEl.createEl("button", { 
					cls: "mod-warning" 
				});
				setIcon(removeBtn, "trash-2");
				removeBtn.addEventListener("click", () => {
					const folders = this.plugin.settings.ignoredFolders ?? [];
					this.plugin.settings.ignoredFolders = folders.filter(f => f !== folder);
					void this.plugin.saveSettings().then(() => {
						this.display();
					});
				});
			}
		}

		// Frontmatter attributes section
		let fmInputEl: HTMLInputElement;
		new Setting(containerEl)
			.setName("Frontmatter attributes")
			.setDesc("Add key:value pairs to index file frontmatter")
			.addText(text => {
				fmInputEl = text.inputEl;
				// eslint-disable-next-line obsidianmd/ui/sentence-case
				text.setPlaceholder("key:value");
			})
			.addButton(btn => btn
				.setButtonText("Add")
				.onClick(async () => {
					const value = fmInputEl.value.trim();
					const [key, val] = value.split(":");
					const attributes = this.plugin.settings.frontmatterAttributes ?? [];
					if (key && val && !attributes.some(attr => attr.key === key)) {
						this.plugin.settings.frontmatterAttributes = [...attributes, { key: key.trim(), value: val.trim() }];
						await this.plugin.saveSettings();
						fmInputEl.value = "";
						this.display();
					}
				}));

		const frontmatterAttributes = this.plugin.settings.frontmatterAttributes ?? [];
		if (frontmatterAttributes.length > 0) {
			const fmListContainer = containerEl.createDiv("settings-item-list");
			
			for (const [index, attr] of frontmatterAttributes.entries()) {
				const attrEl = fmListContainer.createDiv("settings-item-list-item");
				
				const textInput = attrEl.createEl("input", {
					type: "text",
					cls: "settings-item-list-input",
					value: `${attr.key}:${attr.value}`
				});
				textInput.addEventListener("change", () => {
					const [newKey, ...rest] = textInput.value.split(":");
					const newVal = rest.join(":");
					if (newKey && newVal) {
						const attrs = this.plugin.settings.frontmatterAttributes ?? [];
						attrs[index] = { 
							key: newKey.trim(), 
							value: newVal.trim() 
						};
						this.plugin.settings.frontmatterAttributes = attrs;
						void this.plugin.saveSettings();
					}
				});

				const removeBtn = attrEl.createEl("button", { 
					cls: "mod-warning" 
				});
				setIcon(removeBtn, "trash-2");
				removeBtn.addEventListener("click", () => {
					const attrs = this.plugin.settings.frontmatterAttributes ?? [];
					this.plugin.settings.frontmatterAttributes = attrs.filter(a => a.key !== attr.key);
					void this.plugin.saveSettings().then(() => {
						this.display();
					});
				});
			}
		}
	}
}
