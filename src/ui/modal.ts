import { App, Modal } from "obsidian";

export class HelloWorldModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.setText("Woah!");
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
