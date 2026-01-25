import fs from 'fs/promises';
import path from 'path';
import { getMCPConnection, returnMCPConnection } from '../client';
import {
  MCPToolExecutionContext,
  MCPUsageMetrics,
  MCPToolResponse,
  FileSystemConfig
} from '../types';
import {
  MCPExecutionError,
  MCPRateLimitError,
  MCPTimeoutError,
  MCPValidationError,
  createMCPExecutionError,
  createMCPRateLimitError,
  createMCPTimeoutError,
  createMCPValidationError
} from '../errors';
import { getMCPServerConfig, MCP_FALLBACK_CHAINS } from '../servers';
import { executeMCPTool, executeWithRetryAndFallback } from './shared';

// Rate limiting storage
interface CodebaseRateLimitEntry {
  requests: number[];
  lastCleanup: number;
}

interface CodebaseUsageEntry {
  callCount: number;
  totalExecutionTime: number;
  errorCount: number;
  lastUsed: Date;
  filesScanned: number;
  matchesFound: number;
}

// Rate limiting and usage tracking
const rateLimitStorage = new Map<string, CodebaseRateLimitEntry>();
const usageStorage = new Map<string, Map<string, CodebaseUsageEntry>>();

// Configuration constants
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute for codebase operations
const MAX_SEARCH_RESULTS = 100;
const ALLOWED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.json', '.md', '.txt'];
const IGNORED_PATTERNS = ['node_modules', '.git', '.next', 'dist', 'build', '.DS_Store'];
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Cleanup interval for rate limiting
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStorage.entries()) {
    if (now - entry.lastCleanup > CLEANUP_INTERVAL) {
      rateLimitStorage.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

/**
 * Check rate limit for codebase operations
 */
function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `codebase-${userId}`;

  let entry = rateLimitStorage.get(key);
  if (!entry) {
    entry = { requests: [], lastCleanup: now };
    rateLimitStorage.set(key, entry);
  }

  // Remove old requests outside the window
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  entry.requests = entry.requests.filter(timestamp => timestamp > windowStart);
  entry.lastCleanup = now;

  const currentRequests = entry.requests.length;

  if (currentRequests >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: Math.min(...entry.requests) + RATE_LIMIT_WINDOW_MS
    };
  }

  // Add current request
  entry.requests.push(now);

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - currentRequests - 1,
    resetTime: now + RATE_LIMIT_WINDOW_MS
  };
}

/**
 * Track usage and cost for codebase operations
 */
function trackUsage(
  toolName: string,
  executionTime: number,
  success: boolean,
  filesScanned: number = 0,
  matchesFound: number = 0
): void {
  const serverName = 'codebase';
  let serverUsage = usageStorage.get(serverName);
  if (!serverUsage) {
    serverUsage = new Map();
    usageStorage.set(serverName, serverUsage);
  }

  let toolUsage = serverUsage.get(toolName);
  if (!toolUsage) {
    toolUsage = {
      callCount: 0,
      totalExecutionTime: 0,
      errorCount: 0,
      lastUsed: new Date(),
      filesScanned: 0,
      matchesFound: 0
    };
    serverUsage.set(toolName, toolUsage);
  }

  toolUsage.callCount++;
  toolUsage.totalExecutionTime += executionTime;
  toolUsage.lastUsed = new Date();
  toolUsage.filesScanned += filesScanned;
  toolUsage.matchesFound += matchesFound;

  if (!success) {
    toolUsage.errorCount++;
  }
}

/**
 * Get usage metrics for codebase tools
 */
export function getCodebaseUsageMetrics(): Record<string, MCPUsageMetrics> {
  const serverName = 'codebase';
  const serverUsage = usageStorage.get(serverName);
  if (!serverUsage) return {};

  const metrics: Record<string, MCPUsageMetrics> = {};

  for (const [toolName, usage] of serverUsage.entries()) {
    metrics[toolName] = {
      serverName,
      toolName,
      callCount: usage.callCount,
      totalExecutionTime: usage.totalExecutionTime,
      averageLatency: usage.totalExecutionTime / usage.callCount,
      errorCount: usage.errorCount,
      lastUsed: usage.lastUsed,
      totalCost: usage.filesScanned * 0.000001, // Very small cost per file scanned
      filesScanned: usage.filesScanned,
      matchesFound: usage.matchesFound
    };
  }

  return metrics;
}

/**
 * Validate search path safety
 */
function validateSearchPath(searchPath: string, userId: string): void {
  const absolutePath = path.resolve(searchPath);
  const workspaceRoot = process.cwd();

  // Check if path is within workspace
  if (!absolutePath.startsWith(workspaceRoot)) {
    throw createMCPValidationError(
      'codebase',
      'search_files',
      `Search path must be within workspace: ${searchPath}`
    );
  }

  // Prevent searching in sensitive directories
  const relativePath = path.relative(workspaceRoot, absolutePath);
  const sensitivePatterns = ['.env', 'node_modules', '.git', '.next'];
  if (sensitivePatterns.some(pattern => relativePath.includes(pattern))) {
    throw createMCPValidationError(
      'codebase',
      'search_files',
      `Search in sensitive directories not allowed: ${relativePath}`
    );
  }
}

/**
 * Check if file should be ignored
 */
function shouldIgnoreFile(filePath: string): boolean {
  return IGNORED_PATTERNS.some(pattern => 
    filePath.includes(pattern) || 
    path.basename(filePath).startsWith(pattern)
  );
}

/**
 * Check if file extension is allowed
 */
function isAllowedExtension(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

/**
 * Recursively scan directory for files
 */
async function scanDirectory(
  dirPath: string,
  recursive: boolean = true,
  maxDepth: number = 5
): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      // Skip ignored files/directories
      if (shouldIgnoreFile(fullPath)) {
        continue;
      }
      
      if (entry.isDirectory() && recursive && maxDepth > 0) {
        // Recursively scan subdirectories
        const subFiles = await scanDirectory(fullPath, true, maxDepth - 1);
        files.push(...subFiles);
      } else if (entry.isFile() && isAllowedExtension(fullPath)) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Skip inaccessible directories
    console.warn(`Cannot access directory: ${dirPath}`, error);
  }
  
  return files;
}

/**
 * Search for files containing specific text
 */
export async function searchFiles(
  searchPath: string,
  searchTerm: string,
  userId: string,
  options: {
    caseSensitive?: boolean;
    wholeWord?: boolean;
    recursive?: boolean;
    maxResults?: number;
    fileExtensions?: string[];
  } = {}
): Promise<MCPToolResponse> {
  const startTime = Date.now();
  let filesScanned = 0;
  let matchesFound = 0;

  try {
    // Validate search path
    validateSearchPath(searchPath, userId);
    
    // Apply default options
    const {
      caseSensitive = false,
      wholeWord = false,
      recursive = true,
      maxResults = MAX_SEARCH_RESULTS,
      fileExtensions = ALLOWED_EXTENSIONS
    } = options;
    
    // Prepare search term
    let searchRegex: RegExp;
    if (wholeWord) {
      const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      searchRegex = new RegExp(`\\b${escapedTerm}\\b`, caseSensitive ? 'g' : 'gi');
    } else {
      searchRegex = new RegExp(searchTerm, caseSensitive ? 'g' : 'gi');
    }
    
    // Scan for files
    const files = await scanDirectory(searchPath, recursive);
    const filteredFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return fileExtensions.includes(ext);
    });
    
    // Search through files
    const results: Array<{
      filePath: string;
      matches: Array<{ line: number; content: string; position: number }>;
      fileName: string;
    }> = [];
    
    for (const filePath of filteredFiles) {
      filesScanned++;
      
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.split('\n');
        const fileMatches: Array<{ line: number; content: string; position: number }> = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          let match;
          while ((match = searchRegex.exec(line)) !== null) {
            fileMatches.push({
              line: i + 1,
              content: line.trim(),
              position: match.index
            });
            matchesFound++;
            
            // Limit matches per file
            if (fileMatches.length >= 10) break;
          }
          
          // Stop searching if we have enough matches
          if (results.length >= maxResults) break;
        }
        
        if (fileMatches.length > 0) {
          results.push({
            filePath,
            matches: fileMatches,
            fileName: path.basename(filePath)
          });
        }
        
        // Stop if we have enough results
        if (results.length >= maxResults) break;
        
      } catch (error) {
        // Skip files that can't be read
        console.warn(`Cannot read file: ${filePath}`, error);
      }
    }
    
    const executionTime = Date.now() - startTime;
    
    // Track successful operation
    trackUsage('search_files', executionTime, true, filesScanned, matchesFound);
    
    return {
      success: true,
      data: {
        searchTerm,
        results,
        totalFilesScanned: filesScanned,
        totalMatches: matchesFound,
        searchPath,
        options: {
          caseSensitive,
          wholeWord,
          recursive,
          maxResults,
          fileExtensions
        }
      },
      executionTime,
      serverName: 'codebase',
      toolName: 'search_files',
      metrics: {
        estimatedCost: filesScanned * 0.000001,
        filesScanned,
        matchesFound
      }
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    // Track failed operation
    trackUsage('search_files', executionTime, false, 0, 0);
    
    throw error instanceof Error && error.name.startsWith('MCP')
      ? error
      : createMCPExecutionError('codebase', 'search_files', error as Error);
  }
}

/**
 * Find files by name pattern
 */
export async function findFiles(
  searchPath: string,
  fileNamePattern: string,
  userId: string,
  options: {
    recursive?: boolean;
    maxResults?: number;
    fileExtensions?: string[];
  } = {}
): Promise<MCPToolResponse> {
  const startTime = Date.now();
  let filesScanned = 0;

  try {
    // Validate search path
    validateSearchPath(searchPath, userId);
    
    // Apply default options
    const {
      recursive = true,
      maxResults = MAX_SEARCH_RESULTS,
      fileExtensions = ALLOWED_EXTENSIONS
    } = options;
    
    // Create regex from pattern
    const fileNameRegex = new RegExp(fileNamePattern, 'i');
    
    // Scan for files
    const files = await scanDirectory(searchPath, recursive);
    const filteredFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return fileExtensions.includes(ext);
    });
    
    // Match files by name
    const results: string[] = [];
    
    for (const filePath of filteredFiles) {
      filesScanned++;
      const fileName = path.basename(filePath);
      
      if (fileNameRegex.test(fileName)) {
        results.push(filePath);
      }
      
      // Stop if we have enough results
      if (results.length >= maxResults) break;
    }
    
    const executionTime = Date.now() - startTime;
    
    // Track successful operation
    trackUsage('find_files', executionTime, true, filesScanned, results.length);
    
    return {
      success: true,
      data: {
        fileNamePattern,
        results,
        totalFilesScanned: filesScanned,
        searchPath,
        options: {
          recursive,
          maxResults,
          fileExtensions
        }
      },
      executionTime,
      serverName: 'codebase',
      toolName: 'find_files',
      metrics: {
        estimatedCost: filesScanned * 0.000001,
        filesScanned,
        matchesFound: results.length
      }
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    // Track failed operation
    trackUsage('find_files', executionTime, false, 0, 0);
    
    throw error instanceof Error && error.name.startsWith('MCP')
      ? error
      : createMCPExecutionError('codebase', 'find_files', error as Error);
  }
}

/**
 * Analyze project structure and dependencies
 */
export async function analyzeProjectStructure(
  projectPath: string,
  userId: string
): Promise<MCPToolResponse> {
  const startTime = Date.now();
  let filesScanned = 0;

  try {
    // Validate project path
    validateSearchPath(projectPath, userId);
    
    // Scan project structure
    const files = await scanDirectory(projectPath, true, 3); // Limit depth to 3 for performance
    
    // Categorize files by type
    const fileCategories: Record<string, number> = {};
    const dependencies: Set<string> = new Set();
    let totalLines = 0;
    
    for (const filePath of files) {
      filesScanned++;
      const ext = path.extname(filePath).toLowerCase();
      
      // Count file types
      fileCategories[ext] = (fileCategories[ext] || 0) + 1;
      
      // Analyze TypeScript/JavaScript files for dependencies
      if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx') {
        try {
          const content = await fs.readFile(filePath, 'utf8');
          totalLines += content.split('\n').length;
          
          // Extract import statements
          const importMatches = content.match(/from\s+['"]([^'"]+)['"]/g) || [];
          importMatches.forEach(matchStr => {
            const dep = (matchStr as string).match(/from\s+['"]([^'"]+)['"]/)?.[1];
            if (dep && !dep.startsWith('.')) {
              dependencies.add(dep);
            }
          });
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }
    
    // Get directory structure
    const directories = new Set<string>();
    files.forEach(filePath => {
      const dir = path.dirname(filePath);
      directories.add(dir);
    });
    
    const executionTime = Date.now() - startTime;
    
    // Track successful operation
    trackUsage('analyze_structure', executionTime, true, filesScanned, 0);
    
    return {
      success: true,
      data: {
        projectPath,
        totalFiles: files.length,
        totalLines,
        fileCategories,
        dependencies: Array.from(dependencies),
        directoryCount: directories.size,
        commonDependencies: Array.from(dependencies).filter(dep => 
          dep.includes('react') || 
          dep.includes('next') || 
          dep.includes('@types') ||
          dep.includes('tailwind')
        ).slice(0, 10)
      },
      executionTime,
      serverName: 'codebase',
      toolName: 'analyze_structure',
      metrics: {
        estimatedCost: filesScanned * 0.000002, // Higher cost for analysis
        filesScanned
      }
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    // Track failed operation
    trackUsage('analyze_structure', executionTime, false, 0, 0);
    
    throw error instanceof Error && error.name.startsWith('MCP')
      ? error
      : createMCPExecutionError('codebase', 'analyze_structure', error as Error);
  }
}

/**
 * Get file content with context
 */
export async function getFileWithContext(
  filePath: string,
  userId: string,
  options: {
    linesBefore?: number;
    linesAfter?: number;
    maxLines?: number;
  } = {}
): Promise<MCPToolResponse> {
  const startTime = Date.now();

  try {
    // Validate file path
    validateSearchPath(filePath, userId);
    
    // Apply default options
    const {
      linesBefore = 3,
      linesAfter = 3,
      maxLines = 50
    } = options;
    
    // Read file content
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Create context-aware content
    const contextLines: Array<{ line: number; content: string; type: 'target' | 'context' }> = [];
    
    for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
      const lineContent = lines[i];
      const lineNum = i + 1;
      
      // Determine if this is target line or context
      const isTarget = lineContent.trim().length > 0 && 
                       !lineContent.trim().startsWith('//') && 
                       !lineContent.trim().startsWith('/*');
      
      contextLines.push({
        line: lineNum,
        content: lineContent,
        type: isTarget ? 'target' : 'context'
      });
    }
    
    const executionTime = Date.now() - startTime;
    
    // Track successful operation
    trackUsage('get_file_context', executionTime, true, 1, 0);
    
    return {
      success: true,
      data: {
        filePath,
        fileName: path.basename(filePath),
        totalLines: lines.length,
        contextLines,
        options: {
          linesBefore,
          linesAfter,
          maxLines
        }
      },
      executionTime,
      serverName: 'codebase',
      toolName: 'get_file_context',
      metrics: {
        estimatedCost: 0.00001,
        filesScanned: 1
      }
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    // Track failed operation
    trackUsage('get_file_context', executionTime, false, 0, 0);
    
    throw error instanceof Error && error.name.startsWith('MCP')
      ? error
      : createMCPExecutionError('codebase', 'get_file_context', error as Error);
  }
}

/**
 * Check if codebase tools are available
 */
export async function isCodebaseAvailable(): Promise<boolean> {
  try {
    // Test basic file system access
    const testPath = process.cwd();
    const files = await fs.readdir(testPath);
    return files.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Get codebase configuration
 */
export function getCodebaseConfig(): FileSystemConfig | null {
  return {
    name: 'codebase',
    endpoint: 'local',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    poolSize: 5,
    capabilities: ['search_files', 'find_files', 'analyze_structure', 'get_file_context'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedDirectories: ['/src', '/public', '/components', '/lib', '/utils', '/styles', '/pages', '/app'],
    backupDirectory: '.backups',
    rateLimit: {
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxRequests: RATE_LIMIT_MAX_REQUESTS
    }
  };
}