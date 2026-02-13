import { TFile, TFolder, Vault } from "obsidian";

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
 * Format the contents section with heading.
 */
export function formatContentsSection(content: string): string {
	return `${CONTENTS_HEADING}\n\n${content}`;
}

/**
 * Find the end of the Contents section (next heading or EOF).
 */
function findSectionEnd(fileContent: string, startAfterHeading: number): number {
	// Look for the next heading (any level) after the Contents heading
	const nextHeadingMatch = fileContent.substring(startAfterHeading).match(/\n(#{1,6}\s)/);
	if (nextHeadingMatch?.index !== undefined) {
		return startAfterHeading + nextHeadingMatch.index;
	}
	return fileContent.length;
}

/**
 * Extract the content under ## Contents heading, if present.
 * Returns null if no Contents heading found.
 */
export function extractMarkedSection(fileContent: string): string | null {
	const headingIdx = fileContent.indexOf(CONTENTS_HEADING);
	if (headingIdx === -1) {
		return null;
	}

	const contentStart = headingIdx + CONTENTS_HEADING.length;
	const sectionEnd = findSectionEnd(fileContent, contentStart);

	return fileContent.substring(contentStart, sectionEnd).trim();
}

/**
 * Replace the Contents section with new content.
 * If no Contents heading exists, append the section.
 */
export function replaceMarkedSection(fileContent: string, newListContent: string): string {
	const formatted = formatContentsSection(newListContent);
	const headingIdx = fileContent.indexOf(CONTENTS_HEADING);

	if (headingIdx === -1) {
		// No existing Contents section - append
		const trimmed = fileContent.trimEnd();
		return trimmed.length > 0 ? `${trimmed}\n\n${formatted}` : formatted;
	}

	// Replace existing section
	const contentStart = headingIdx + CONTENTS_HEADING.length;
	const sectionEnd = findSectionEnd(fileContent, contentStart);

	const before = fileContent.substring(0, headingIdx);
	const after = fileContent.substring(sectionEnd);
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
