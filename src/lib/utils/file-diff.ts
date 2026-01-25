import fs from 'fs/promises';
import path from 'path';
import { diffLines, Change } from 'diff';

/**
 * File Diff Generator Utility
 * 
 * Generates human-readable diffs showing changes between file versions
 * with syntax highlighting support and contextual information
 */

export interface FileDiff {
  filePath: string;
  fileName: string;
  changes: DiffChange[];
  summary: {
    added: number;
    removed: number;
    unchanged: number;
    totalLines: number;
  };
  hunks: DiffHunk[];
}

export interface DiffChange {
  type: 'added' | 'removed' | 'unchanged';
  lineNumber: number;
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffHunk {
  header: string;
  changes: DiffChange[];
  oldStart: number;
  newStart: number;
  oldLines: number;
  newLines: number;
}

export interface DiffOptions {
  contextLines?: number;
  ignoreWhitespace?: boolean;
  ignoreCase?: boolean;
  showLineNumbers?: boolean;
}

/**
 * Generate diff between two file versions
 */
export async function generateFileDiff(
  filePath: string,
  oldContent: string,
  newContent: string,
  options: DiffOptions = {}
): Promise<FileDiff> {
  const {
    contextLines = 3,
    ignoreWhitespace = false,
    ignoreCase = false,
    showLineNumbers = true
  } = options;

  // Normalize content if needed
  let normalizedOld = oldContent;
  let normalizedNew = newContent;
  
  if (ignoreWhitespace) {
    normalizedOld = oldContent.replace(/\s+/g, ' ').trim();
    normalizedNew = newContent.replace(/\s+/g, ' ').trim();
  }
  
  if (ignoreCase) {
    normalizedOld = normalizedOld.toLowerCase();
    normalizedNew = normalizedNew.toLowerCase();
  }

  // Generate line-based diff
  const changes = diffLines(normalizedOld, normalizedNew, {
    newlineIsToken: true
  });

  // Process changes into structured format
  const diffChanges: DiffChange[] = [];
  const hunks: DiffHunk[] = [];
  
  let oldLine = 1;
  let newLine = 1;
  let hunkChanges: DiffChange[] = [];
  let hunkStartOld = 1;
  let hunkStartNew = 1;

  // Statistics
  let added = 0;
  let removed = 0;
  let unchanged = 0;

  for (const change of changes) {
    const lines = change.value.split('\n');
    
    // Remove empty line at the end if it exists
    if (lines[lines.length - 1] === '') {
      lines.pop();
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isFirstLine = i === 0;
      const isLastLine = i === lines.length - 1;
      
      let changeType: 'added' | 'removed' | 'unchanged';
      
      if (change.added) {
        changeType = 'added';
        added++;
      } else if (change.removed) {
        changeType = 'removed';
        removed++;
      } else {
        changeType = 'unchanged';
        unchanged++;
      }

      const diffChange: DiffChange = {
        type: changeType,
        lineNumber: changeType === 'added' ? newLine : oldLine,
        content: line,
        oldLineNumber: changeType === 'removed' || changeType === 'unchanged' ? oldLine : undefined,
        newLineNumber: changeType === 'added' || changeType === 'unchanged' ? newLine : undefined
      };

      diffChanges.push(diffChange);

      // Track line numbers
      if (changeType === 'added' || changeType === 'unchanged') {
        newLine++;
      }
      if (changeType === 'removed' || changeType === 'unchanged') {
        oldLine++;
      }

      // Group changes into hunks (sections with context)
      if (changeType !== 'unchanged' || hunkChanges.length > 0) {
        if (hunkChanges.length === 0) {
          // Start new hunk
          hunkStartOld = oldLine - (changeType === 'added' ? 0 : 1);
          hunkStartNew = newLine - (changeType === 'removed' ? 0 : 1);
        }
        hunkChanges.push(diffChange);
      } else if (hunkChanges.length > 0 && hunkChanges.length >= contextLines * 2) {
        // Close current hunk and start new one
        const hunk = createHunk(hunkChanges, hunkStartOld, hunkStartNew);
        hunks.push(hunk);
        hunkChanges = [];
      }
    }
  }

  // Close final hunk if needed
  if (hunkChanges.length > 0) {
    const hunk = createHunk(hunkChanges, hunkStartOld, hunkStartNew);
    hunks.push(hunk);
  }

  return {
    filePath,
    fileName: path.basename(filePath),
    changes: diffChanges,
    summary: {
      added,
      removed,
      unchanged,
      totalLines: oldLine + newLine - 2
    },
    hunks
  };
}

/**
 * Create a diff hunk from changes
 */
function createHunk(changes: DiffChange[], oldStart: number, newStart: number): DiffHunk {
  const addedLines = changes.filter(c => c.type === 'added').length;
  const removedLines = changes.filter(c => c.type === 'removed').length;
  const unchangedLines = changes.filter(c => c.type === 'unchanged').length;
  
  // Calculate hunk header
  const header = `@@ -${oldStart},${removedLines + unchangedLines} +${newStart},${addedLines + unchangedLines} @@`;
  
  return {
    header,
    changes,
    oldStart,
    newStart,
    oldLines: removedLines + unchangedLines,
    newLines: addedLines + unchangedLines
  };
}

/**
 * Generate diff from file paths (reads files automatically)
 */
export async function generateFileDiffFromPaths(
  filePath: string,
  oldFilePath: string,
  newFilePath: string,
  options?: DiffOptions
): Promise<FileDiff> {
  try {
    const oldContent = await fs.readFile(oldFilePath, 'utf8');
    const newContent = await fs.readFile(newFilePath, 'utf8');
    
    return generateFileDiff(filePath, oldContent, newContent, options);
  } catch (error) {
    throw new Error(`Failed to read files for diff generation: ${(error as Error).message}`);
  }
}

/**
 * Generate diff comparing current file with backup
 */
export async function generateFileDiffWithBackup(
  filePath: string,
  backupPath: string,
  options?: DiffOptions
): Promise<FileDiff> {
  try {
    const currentContent = await fs.readFile(filePath, 'utf8');
    const backupContent = await fs.readFile(backupPath, 'utf8');
    
    return generateFileDiff(filePath, backupContent, currentContent, options);
  } catch (error) {
    throw new Error(`Failed to generate diff with backup: ${(error as Error).message}`);
  }
}

/**
 * Format diff for display
 */
export function formatDiffForDisplay(diff: FileDiff, format: 'unified' | 'side-by-side' = 'unified'): string {
  if (format === 'unified') {
    return formatUnifiedDiff(diff);
  } else {
    return formatSideBySideDiff(diff);
  }
}

/**
 * Format as unified diff (standard format)
 */
function formatUnifiedDiff(diff: FileDiff): string {
  let output = `--- a/${diff.fileName}\n`;
  output += `+++ b/${diff.fileName}\n`;
  
  for (const hunk of diff.hunks) {
    output += `${hunk.header}\n`;
    
    for (const change of hunk.changes) {
      const prefix = change.type === 'added' ? '+' : change.type === 'removed' ? '-' : ' ';
      const lineNumber = change.newLineNumber ?? change.oldLineNumber ?? change.lineNumber;
      output += `${prefix}${change.content}\n`;
    }
    
    output += '\n';
  }
  
  return output;
}

/**
 * Format as side-by-side diff
 */
function formatSideBySideDiff(diff: FileDiff): string {
  let output = `File: ${diff.fileName}\n`;
  output += '='.repeat(80) + '\n\n';
  
  for (const hunk of diff.hunks) {
    output += `Hunk: ${hunk.header}\n`;
    output += '-'.repeat(40) + ' OLD ' + '-'.repeat(35) + ' NEW ' + '-'.repeat(40) + '\n';
    
    const oldLines = hunk.changes.filter(c => c.type !== 'added');
    const newLines = hunk.changes.filter(c => c.type !== 'removed');
    
    const maxLines = Math.max(oldLines.length, newLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const oldChange = oldLines[i];
      const newChange = newLines[i];
      
      const oldLine = oldChange ? 
        `${oldChange.oldLineNumber?.toString().padStart(4)} ${oldChange.content}` : 
        '    ';
      const newLine = newChange ? 
        `${newChange.newLineNumber?.toString().padStart(4)} ${newChange.content}` : 
        '    ';
      
      const oldPrefix = oldChange?.type === 'removed' ? '-' : ' ';
      const newPrefix = newChange?.type === 'added' ? '+' : ' ';
      
      output += `${oldPrefix}${oldLine} | ${newPrefix}${newLine}\n`;
    }
    
    output += '\n';
  }
  
  return output;
}

/**
 * Generate HTML-formatted diff for web display
 */
export function formatDiffAsHTML(diff: FileDiff): string {
  let html = `<div class="file-diff" data-file="${diff.fileName}">\n`;
  html += `  <h3>${diff.fileName}</h3>\n`;
  html += `  <div class="diff-summary">\n`;
  html += `    <span class="added">+${diff.summary.added} added</span>\n`;
  html += `    <span class="removed">-${diff.summary.removed} removed</span>\n`;
  html += `    <span class="unchanged">${diff.summary.unchanged} unchanged</span>\n`;
  html += `  </div>\n`;
  
  for (const hunk of diff.hunks) {
    html += `  <div class="diff-hunk">\n`;
    html += `    <div class="hunk-header">${hunk.header}</div>\n`;
    html += `    <pre class="diff-content">\n`;
    
    for (const change of hunk.changes) {
      const className = `diff-line diff-${change.type}`;
      const lineNumber = change.newLineNumber ?? change.oldLineNumber ?? change.lineNumber;
      html += `      <div class="${className}">\n`;
      html += `        <span class="line-number">${lineNumber}</span>\n`;
      html += `        <span class="line-content">${escapeHtml(change.content)}</span>\n`;
      html += `      </div>\n`;
    }
    
    html += `    </pre>\n`;
    html += `  </div>\n`;
  }
  
  html += `</div>`;
  
  return html;
}

/**
 * Escape HTML entities
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Get color-coded diff for terminal display
 */
export function formatDiffForTerminal(diff: FileDiff): string {
  let output = `\x1b[1;36mFile: ${diff.fileName}\x1b[0m\n`;
  output += `\x1b[1;37m${'='.repeat(60)}\x1b[0m\n\n`;
  
  output += `\x1b[1;32m+${diff.summary.added} added\x1b[0m `;
  output += `\x1b[1;31m-${diff.summary.removed} removed\x1b[0m `;
  output += `\x1b[1;34m${diff.summary.unchanged} unchanged\x1b[0m\n\n`;
  
  for (const hunk of diff.hunks) {
    output += `\x1b[1;35m${hunk.header}\x1b[0m\n`;
    
    for (const change of hunk.changes) {
      let color: string;
      let prefix: string;
      
      switch (change.type) {
        case 'added':
          color = '\x1b[32m'; // Green
          prefix = '+';
          break;
        case 'removed':
          color = '\x1b[31m'; // Red
          prefix = '-';
          break;
        default:
          color = '\x1b[37m'; // White
          prefix = ' ';
          break;
      }
      
      const lineNumber = change.newLineNumber ?? change.oldLineNumber ?? change.lineNumber;
      output += `${color}${prefix}${lineNumber.toString().padStart(4)} ${change.content}\x1b[0m\n`;
    }
    
    output += '\n';
  }
  
  return output;
}

/**
 * Check if two file contents are different
 */
export function filesAreDifferent(content1: string, content2: string): boolean {
  return content1 !== content2;
}

/**
 * Get diff statistics
 */
export function getDiffStatistics(diff: FileDiff): {
  hasChanges: boolean;
  changePercentage: number;
  significantChanges: boolean;
} {
  const totalLines = diff.summary.totalLines;
  const changedLines = diff.summary.added + diff.summary.removed;
  const changePercentage = totalLines > 0 ? (changedLines / totalLines) * 100 : 0;
  const hasChanges = changedLines > 0;
  const significantChanges = changePercentage > 10; // More than 10% of lines changed
  
  return {
    hasChanges,
    changePercentage,
    significantChanges
  };
}