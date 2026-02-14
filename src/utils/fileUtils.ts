import { TFile, TFolder, Vault } from "obsidian";

const INDEX_START_MARKER = "%% INDEX STARTS HERE %%";
const INDEX_END_MARKER = "%% INDEX ENDS HERE %%";
const CONTENTS_HEADING = "## Contents";

/**
 * Get the parent folder path from a file.
 */
export function getParentPath(file: TFile): string {
	const lastSlash = file.path.lastIndexOf("/");
	return lastSlash === -1 ? "" : file.path.substring(0, lastSlash);
}

/**
 * Get immediate subfolders of a folder path.
 */
export function getImmediateSubfolders(vault: Vault, folderPath: string): TFolder[] {
	const folder = folderPath === "" 
		? vault.getRoot() 
		: vault.getAbstractFileByPath(folderPath);
	
	if (!folder || !(folder instanceof TFolder)) {
		return [];
	}

	return folder.children.filter((child): child is TFolder => child instanceof TFolder);
}

/**
 * Format the contents section with markers and heading.
 */
export function formatContentsSection(content: string): string {
	return `${INDEX_START_MARKER}\n${CONTENTS_HEADING}\n\n${content}\n${INDEX_END_MARKER}`;
}

/**
 * Extract the content between index markers, if present.
 * Returns null if no markers found.
 */
export function extractMarkedSection(fileContent: string): string | null {
	const startIdx = fileContent.indexOf(INDEX_START_MARKER);
	const endIdx = fileContent.indexOf(INDEX_END_MARKER);

	if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
		return null;
	}

	const contentStart = startIdx + INDEX_START_MARKER.length;
	return fileContent.substring(contentStart, endIdx).trim();
}

/**
 * Replace the marked section with new content.
 * If no markers exist, append the section.
 */
export function replaceMarkedSection(fileContent: string, newListContent: string): string {
	const formatted = formatContentsSection(newListContent);
	const startIdx = fileContent.indexOf(INDEX_START_MARKER);
	const endIdx = fileContent.indexOf(INDEX_END_MARKER);

	if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
		// No existing markers - append
		const trimmed = fileContent.trimEnd();
		return trimmed.length > 0 ? `${trimmed}\n\n${formatted}` : formatted;
	}

	// Replace existing section (including both markers)
	const before = fileContent.substring(0, startIdx);
	const after = fileContent.substring(endIdx + INDEX_END_MARKER.length);
	return `${before}${formatted}${after}`;
}

/**
 * Simple hash function for content comparison.
 * Uses string comparison for simplicity - returns the content itself as the "hash".
 * For large files, consider implementing djb2 or similar.
 */
export function computeContentHash(content: string): string {
	// Simple approach: normalize and use content as its own hash
	return content.trim();
}
