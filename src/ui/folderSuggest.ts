import { AbstractInputSuggest, App, TFolder } from "obsidian";

/**
 * Autocomplete suggestions for folder paths.
 */
export class FolderSuggest extends AbstractInputSuggest<TFolder> {
	private textInputEl: HTMLInputElement;

	constructor(app: App, inputEl: HTMLInputElement) {
		super(app, inputEl);
		this.textInputEl = inputEl;
	}

	getSuggestions(inputStr: string): TFolder[] {
		const lowerInput = inputStr.toLowerCase();
		const folders: TFolder[] = [];

		// Recursively collect all folders
		const collectFolders = (folder: TFolder) => {
			for (const child of folder.children) {
				if (child instanceof TFolder) {
					folders.push(child);
					collectFolders(child);
				}
			}
		};

		collectFolders(this.app.vault.getRoot());

		// Filter by input
		return folders.filter(folder => 
			folder.path.toLowerCase().includes(lowerInput)
		).slice(0, 20); // Limit results
	}

	renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.setText(folder.path);
	}

	selectSuggestion(folder: TFolder): void {
		this.textInputEl.value = folder.path;
		this.textInputEl.trigger("input");
		this.close();
	}
}
