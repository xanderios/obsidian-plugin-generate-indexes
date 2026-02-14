import { Editor, MarkdownView, Notice, Plugin, TFile } from "obsidian";
import { DEFAULT_SETTINGS, HelloWorldPluginSettings, HelloWorldPluginSettingTab, FrontmatterAttribute } from "./settings";
import { HelloWorldModal } from "./ui/modal";
import { 
	getIndexFiles, 
	getSiblingFiles, 
	getNestedIndexFiles, 
	generateListContent
} from "./utils/indexGenerator";
import { 
	extractMarkedSection, 
	replaceMarkedSection, 
	computeContentHash,
	getParentPath
} from "./utils/fileUtils";

export default class HelloWorldPlugin extends Plugin {
	settings: HelloWorldPluginSettings;

	/**
	 * Inject/update YAML frontmatter attributes in a markdown file.
	 */
	private injectFrontmatter(content: string, attributes: FrontmatterAttribute[]): string {
		if (attributes.length === 0) return content;
		const yamlRegex = /^---\n([\s\S]*?)\n---\n?/;
		let yamlBlock = "";
		let rest = content;
		let yamlObj: Record<string, string> = {};

		const match = content.match(yamlRegex);
		if (match && match[1]) {
			yamlBlock = match[1];
			rest = content.slice(match[0].length);
			for (const line of yamlBlock.split("\n")) {
				const [k, ...v] = line.split(":");
				if (k && v.length) yamlObj[k.trim()] = v.join(":").trim();
			}
		}

		for (const attr of attributes) {
			yamlObj[attr.key] = attr.value;
		}

		const newYaml = Object.entries(yamlObj)
			.map(([k, v]) => `${k}: ${v}`)
			.join("\n");
		return `---\n${newYaml}\n---\n${rest}`;
	}

	private async updateIndexFile(indexFile: TFile): Promise<boolean> {
		const identifierPattern = this.settings.indexIdentifier;
		const sortEnabled = this.settings.sortEnabled ?? true;
		const sortOrder = this.settings.sortOrder ?? "asc";
		const displayFormat = this.settings.indexDisplayFormat ?? "📁 {name}";
		const displayStripPattern = this.settings.displayStripPattern ?? "";
		const ignoredFolders = this.settings.ignoredFolders ?? [];
		const frontmatterAttributes = this.settings.frontmatterAttributes ?? [];

		// Gather files for this index
		const siblings = getSiblingFiles(this.app.vault, indexFile, identifierPattern, ignoredFolders);
		const nestedIndexes = getNestedIndexFiles(this.app.vault, indexFile, identifierPattern, ignoredFolders);

		// Generate new list content
		const newListContent = generateListContent(
			siblings, 
			nestedIndexes, 
			sortEnabled,
			sortOrder, 
			displayStripPattern, 
			displayFormat
		);
		const newHash = computeContentHash(newListContent);

		// Read current file content
		let currentContent = await this.app.vault.read(indexFile);

		// Inject/update frontmatter
		currentContent = this.injectFrontmatter(currentContent, frontmatterAttributes);

		// Extract existing marked section and compare
		const existingSection = extractMarkedSection(currentContent);
		const existingHash = existingSection ? computeContentHash(existingSection) : null;

		// Only update if content changed
		if (existingHash !== newHash) {
			const updatedContent = replaceMarkedSection(currentContent, newListContent);
			await this.app.vault.modify(indexFile, updatedContent);
			return true;
		}
		return false;
	}

	/**
	 * Generate indexes for all index files in the vault.
	 */
	async generateIndexesForVault(): Promise<void> {
		const identifierPattern = this.settings.indexIdentifier;
		const ignoredFolders = this.settings.ignoredFolders ?? [];
		const indexFiles = getIndexFiles(this.app.vault, identifierPattern, ignoredFolders);

		if (indexFiles.length === 0) {
			new Notice(`No index files found matching pattern "${identifierPattern}"`);
			return;
		}

		let updatedCount = 0;
		for (const indexFile of indexFiles) {
			if (await this.updateIndexFile(indexFile)) {
				updatedCount++;
			}
		}

		if (updatedCount > 0) {
			new Notice(`Updated ${updatedCount} index file${updatedCount > 1 ? "s" : ""}`);
		} else {
			new Notice("All index files are up to date");
		}
	}

	/**
	 * Generate index for the current folder (based on active file).
	 */
	async generateIndexForCurrentFolder(): Promise<void> {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice("No active file");
			return;
		}

		const identifierPattern = this.settings.indexIdentifier;
		const currentFolder = getParentPath(activeFile);
		const ignoredFolders = this.settings.ignoredFolders ?? [];

		// Find index file in current folder
		const indexFiles = getIndexFiles(this.app.vault, identifierPattern, ignoredFolders);
		const indexInFolder = indexFiles.find(f => getParentPath(f) === currentFolder);

		if (!indexInFolder) {
			new Notice(`No index file found in current folder matching pattern "${identifierPattern}"`);
			return;
		}

		if (await this.updateIndexFile(indexInFolder)) {
			new Notice(`Updated ${indexInFolder.name}`);
		} else {
			new Notice(`${indexInFolder.name} is up to date`);
		}
	}

	async onload(): Promise<void> {
		await this.loadSettings();

		// Ribbon icon to generate indexes for entire vault
		this.addRibbonIcon("list-ordered", "Generate indexes", () => {
			void this.generateIndexesForVault();
		});

		// Command: generate indexes for entire vault
		this.addCommand({
			id: "generate-indexes-vault",
			name: "Generate indexes for entire vault",
			callback: () => {
				void this.generateIndexesForVault();
			}
		});

		// Command: generate index for current folder
		this.addCommand({
			id: "generate-indexes-folder",
			name: "Generate indexes for current folder",
			callback: () => {
				void this.generateIndexForCurrentFolder();
			}
		});

		// Example modal command
		this.addCommand({
			id: "open-modal-simple",
			name: "Open modal (simple)",
			callback: () => {
				new HelloWorldModal(this.app).open();
			}
		});

		// Example editor command
		this.addCommand({
			id: "replace-selected",
			name: "Replace selected content",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				editor.replaceSelection("Sample editor command");
			}
		});

		// Settings tab
		this.addSettingTab(new HelloWorldPluginSettingTab(this.app, this));
	}

	onunload(): void {
		// Cleanup handled automatically by Obsidian for registered items
	}

	async loadSettings(): Promise<void> {
		const loadedData = await this.loadData() as Partial<HelloWorldPluginSettings> | null;
		this.settings = {
			...DEFAULT_SETTINGS,
			...loadedData
		};
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
