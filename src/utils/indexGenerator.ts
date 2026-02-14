import { TFile, Vault } from "obsidian";
import type { SortOrder } from "../settings";
import { getParentPath, getImmediateSubfolders } from "./fileUtils";

/**
 * Escape special regex characters in a string.
 */
function escapeRegExp(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Create a RegExp from a pattern string, falling back to literal match on invalid regex.
 */
function createSafeRegex(pattern: string): RegExp | null {
	if (!pattern) return null;
	try {
		return new RegExp(pattern);
	} catch {
		// Invalid regex - treat as literal string
		return new RegExp(escapeRegExp(pattern));
	}
}

/**
 * Check if a basename matches the identifier pattern.
 */
function matchesIdentifier(basename: string, pattern: string): boolean {
	const regex = createSafeRegex(pattern);
	if (!regex) return false;
	return regex.test(basename);
}

/**
 * Check if a file path is inside an ignored folder.
 */
function isInIgnoredFolder(filePath: string, ignoredFolders: string[]): boolean {
	return ignoredFolders.some(folder => {
		// Match exact folder or subfolder
		return filePath === folder || 
		       filePath.startsWith(folder + "/");
	});
}

/**
 * Get all index files in the vault matching the identifier pattern.
 */
export function getIndexFiles(
	vault: Vault, 
	identifierPattern: string, 
	ignoredFolders: string[] = []
): TFile[] {
	return vault.getMarkdownFiles().filter(file => {
		if (!matchesIdentifier(file.basename, identifierPattern)) return false;
		if (isInIgnoredFolder(file.path, ignoredFolders)) return false;
		return true;
	});
}

/**
 * Check if a file is an index file.
 */
export function isIndexFile(file: TFile, identifierPattern: string): boolean {
	return matchesIdentifier(file.basename, identifierPattern);
}

/**
 * Get sibling markdown files in the same folder (excluding index files and self).
 */
export function getSiblingFiles(
	vault: Vault, 
	indexFile: TFile, 
	identifierPattern: string,
	ignoredFolders: string[] = []
): TFile[] {
	const parentPath = getParentPath(indexFile);
	
	return vault.getMarkdownFiles().filter(file => {
		// Must be in same folder
		if (getParentPath(file) !== parentPath) return false;
		// Exclude self
		if (file.path === indexFile.path) return false;
		// Exclude other index files
		if (isIndexFile(file, identifierPattern)) return false;
		// Exclude ignored folders
		if (isInIgnoredFolder(file.path, ignoredFolders)) return false;
		return true;
	});
}

/**
 * Get index files in immediate subfolders (depth 1 only).
 */
export function getNestedIndexFiles(
	vault: Vault, 
	indexFile: TFile, 
	identifierPattern: string,
	ignoredFolders: string[] = []
): TFile[] {
	const parentPath = getParentPath(indexFile);
	const subfolders = getImmediateSubfolders(vault, parentPath);
	
	const nestedIndexes: TFile[] = [];
	
	for (const subfolder of subfolders) {
		// Skip ignored folders
		if (isInIgnoredFolder(subfolder.path, ignoredFolders)) continue;
		
		// Find index files directly in this subfolder
		const indexInSubfolder = vault.getMarkdownFiles().find(file => 
			getParentPath(file) === subfolder.path && isIndexFile(file, identifierPattern)
		);
		if (indexInSubfolder) {
			nestedIndexes.push(indexInSubfolder);
		}
	}
	
	return nestedIndexes;
}

/**
 * Format an index file's display name using the display format.
 */
function formatIndexDisplayName(
	file: TFile, 
	displayStripPattern: string, 
	displayFormat: string
): string {
	let name = file.basename;
	if (displayStripPattern) {
		const regex = createSafeRegex(displayStripPattern);
		if (regex) {
			name = name.replace(regex, "");
			// Fallback if stripping leaves empty
			if (name.length === 0) name = file.basename;
		}
	}
	return displayFormat.replace("{name}", name);
}

/**
 * Sort files by name according to sort order.
 */
function sortFiles(files: TFile[], sortOrder: SortOrder): TFile[] {
	return [...files].sort((a, b) => {
		const comparison = a.name.localeCompare(b.name);
		return sortOrder === "asc" ? comparison : -comparison;
	});
}

/**
 * Generate the numbered list content with wiki links.
 * Nested indexes come first, then siblings. Both groups are sorted.
 */
export function generateListContent(
	siblings: TFile[], 
	nestedIndexes: TFile[],
	sortOrder: SortOrder,
	displayStripPattern: string,
	indexDisplayFormat: string
): string {
	// Sort each group separately
	const sortedNested = sortFiles(nestedIndexes, sortOrder);
	const sortedSiblings = sortFiles(siblings, sortOrder);
	
	// Nested indexes first, then siblings
	const allItems = [...sortedNested, ...sortedSiblings];
	
	if (allItems.length === 0) {
		return "*No files found*";
	}
	
	return allItems.map((file, index) => {
		const isNested = sortedNested.includes(file);
		const linkTarget = file.basename;
		
		if (isNested) {
			// Use alias for nested indexes: [[01 - Projects|📁 Projects]]
			const displayName = formatIndexDisplayName(file, displayStripPattern, indexDisplayFormat);
			return `${index + 1}. [[${linkTarget}|${displayName}]]`;
		} else {
			return `${index + 1}. [[${linkTarget}]]`;
		}
	}).join("\n");
}
