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
interface FileSystemRateLimitEntry {
  requests: number[];
  lastCleanup: number;
}

interface FileSystemUsageEntry {
  callCount: number;
  totalExecutionTime: number;
  errorCount: number;
  lastUsed: Date;
  filesProcessed: number;
  totalBytes: number;
}

// Rate limiting and usage tracking
const rateLimitStorage = new Map<string, FileSystemRateLimitEntry>();
const usageStorage = new Map<string, Map<string, FileSystemUsageEntry>>();

// Configuration constants
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 50; // 50 requests per minute for filesystem operations
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB max file size
const ALLOWED_DIRECTORIES = [
  '/src',
  '/public',
  '/components',
  '/lib',
  '/utils',
  '/styles',
  '/pages',
  '/app'
];
const BACKUP_DIR = '.backups';
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
 * Check rate limit for filesystem operations
 */
function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `filesystem-${userId}`;

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
 * Execute tool with retry logic and fallback strategies
 */
async function executeWithRetry(
  operation: () => Promise<MCPToolResponse>,
  context: MCPToolExecutionContext,
  userId: string
): Promise<MCPToolResponse> {
  // Check rate limit first
  const rateLimitCheck = checkRateLimit(userId);
  if (!rateLimitCheck.allowed) {
    throw createMCPRateLimitError(
      'filesystem',
      context.toolName,
      Math.ceil((rateLimitCheck.resetTime - Date.now()) / 1000)
    );
  }

  // Set fallback servers from configuration
  context.fallbackServers = [];

  const result = await executeWithRetryAndFallback(operation, context, userId, executeMCPTool);

  // Track usage for successful executions
  if (result.success) {
    trackUsage(
      context.toolName,
      result.executionTime,
      true,
      result.metrics?.filesProcessed || 0,
      result.metrics?.totalBytes || 0
    );
  }

  return result;
}

/**
 * Track usage and cost for filesystem operations
 */
function trackUsage(
  toolName: string,
  executionTime: number,
  success: boolean,
  filesProcessed: number = 0,
  bytesProcessed: number = 0
): void {
  const serverName = 'filesystem';
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
      filesProcessed: 0,
      totalBytes: 0
    };
    serverUsage.set(toolName, toolUsage);
  }

  toolUsage.callCount++;
  toolUsage.totalExecutionTime += executionTime;
  toolUsage.lastUsed = new Date();
  toolUsage.filesProcessed += filesProcessed;
  toolUsage.totalBytes += bytesProcessed;

  if (!success) {
    toolUsage.errorCount++;
  }
}

/**
 * Get usage metrics for filesystem tools
 */
export function getFileSystemUsageMetrics(): Record<string, MCPUsageMetrics> {
  const serverName = 'filesystem';
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
      totalCost: usage.totalBytes * 0.0000001, // Very small cost per byte
      filesProcessed: usage.filesProcessed,
      totalBytes: usage.totalBytes
    };
  }

  return metrics;
}

/**
 * Validate file path safety
 */
function validateFilePath(filePath: string, userId: string): void {
  const absolutePath = path.resolve(filePath);
  const workspaceRoot = process.cwd();

  // Check if path is within workspace
  if (!absolutePath.startsWith(workspaceRoot)) {
    throw createMCPValidationError(
      'filesystem',
      'read_file',
      `File path must be within workspace: ${filePath}`
    );
  }

  // Check if directory is allowed
  const relativePath = path.relative(workspaceRoot, absolutePath);
  const firstDir = relativePath.split(path.sep)[0];
  
  if (!ALLOWED_DIRECTORIES.some(dir => firstDir.startsWith(dir.replace('/', '')))) {
    throw createMCPValidationError(
      'filesystem',
      'read_file',
      `Access to directory not allowed: ${firstDir}`
    );
  }

  // Prevent access to sensitive files
  const sensitivePatterns = ['.env', '.git', 'node_modules', '.next'];
  if (sensitivePatterns.some(pattern => relativePath.includes(pattern))) {
    throw createMCPValidationError(
      'filesystem',
      'read_file',
      `Access to sensitive files/directories not allowed: ${relativePath}`
    );
  }
}

/**
 * Check file size before reading
 */
async function checkFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    if (stats.size > MAX_FILE_SIZE_BYTES) {
      throw createMCPValidationError(
        'filesystem',
        'read_file',
        `File too large: ${stats.size} bytes (max: ${MAX_FILE_SIZE_BYTES})`
      );
    }
    return stats.size;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return 0; // File doesn't exist, size is 0
    }
    throw error;
  }
}

/**
 * Create backup of file before modification
 */
export async function createBackup(filePath: string, userId: string): Promise<string> {
  try {
    const absolutePath = path.resolve(filePath);
    const workspaceRoot = process.cwd();
    const relativePath = path.relative(workspaceRoot, absolutePath);
    
    // Create backup directory structure
    const backupPath = path.join(workspaceRoot, BACKUP_DIR, userId, relativePath);
    const backupDir = path.dirname(backupPath);
    
    // Ensure backup directory exists
    await fs.mkdir(backupDir, { recursive: true });
    
    // Copy file to backup location
    await fs.copyFile(absolutePath, backupPath);
    
    return backupPath;
  } catch (error) {
    // If backup fails, we should not proceed with the operation
    throw createMCPExecutionError(
      'filesystem',
      'create_backup',
      new Error(`Failed to create backup: ${(error as Error).message}`)
    );
  }
}

/**
 * Read file contents
 */
export async function readFile(
  filePath: string,
  userId: string,
  encoding: BufferEncoding = 'utf8'
): Promise<MCPToolResponse> {
  const startTime = Date.now();
  let fileSize = 0;

  try {
    // Validate path safety
    validateFilePath(filePath, userId);
    
    // Check file size
    fileSize = await checkFileSize(filePath);
    
    // Read file contents
    const content = await fs.readFile(filePath, encoding);
    
    const executionTime = Date.now() - startTime;
    
    // Track successful operation
    trackUsage('read_file', executionTime, true, 1, fileSize);
    
    return {
      success: true,
      data: {
        content,
        size: fileSize,
        path: filePath,
        encoding
      },
      executionTime,
      serverName: 'filesystem',
      toolName: 'read_file',
      metrics: {
        estimatedCost: fileSize * 0.0000001,
        filesProcessed: 1,
        totalBytes: fileSize
      }
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    // Track failed operation
    trackUsage('read_file', executionTime, false, 0, 0);
    
    throw error instanceof Error && error.name.startsWith('MCP')
      ? error
      : createMCPExecutionError('filesystem', 'read_file', error as Error);
  }
}

/**
 * Write file contents
 */
export async function writeFile(
  filePath: string,
  content: string,
  userId: string,
  createBackupFlag: boolean = true
): Promise<MCPToolResponse> {
  const startTime = Date.now();

  try {
    // Validate path safety
    validateFilePath(filePath, userId);
    
    // Create backup if requested and file exists
    let backupPath: string | undefined;
    if (createBackupFlag) {
      try {
        const stats = await fs.stat(filePath);
        if (stats.isFile()) {
          backupPath = await createBackup(filePath, userId);
        }
      } catch (error) {
        // File doesn't exist, no backup needed
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }
    }
    
    // Ensure directory exists
    const dirPath = path.dirname(filePath);
    await fs.mkdir(dirPath, { recursive: true });
    
    // Write file
    await fs.writeFile(filePath, content, 'utf8');
    
    const executionTime = Date.now() - startTime;
    const fileSize = Buffer.byteLength(content, 'utf8');
    
    // Track successful operation
    trackUsage('write_file', executionTime, true, 1, fileSize);
    
    return {
      success: true,
      data: {
        path: filePath,
        size: fileSize,
        backupPath,
        message: 'File written successfully'
      },
      executionTime,
      serverName: 'filesystem',
      toolName: 'write_file',
      metrics: {
        estimatedCost: fileSize * 0.0000001,
        filesProcessed: 1,
        totalBytes: fileSize
      }
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    // Track failed operation
    trackUsage('write_file', executionTime, false, 0, 0);
    
    throw error instanceof Error && error.name.startsWith('MCP')
      ? error
      : createMCPExecutionError('filesystem', 'write_file', error as Error);
  }
}

/**
 * Create new file
 */
export async function createFile(
  filePath: string,
  content: string = '',
  userId: string
): Promise<MCPToolResponse> {
  const startTime = Date.now();

  try {
    // Validate path safety
    validateFilePath(filePath, userId);
    
    // Check if file already exists
    try {
      await fs.access(filePath);
      throw createMCPValidationError(
        'filesystem',
        'create_file',
        `File already exists: ${filePath}`
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
    
    // Ensure directory exists
    const dirPath = path.dirname(filePath);
    await fs.mkdir(dirPath, { recursive: true });
    
    // Create file
    await fs.writeFile(filePath, content, 'utf8');
    
    const executionTime = Date.now() - startTime;
    const fileSize = Buffer.byteLength(content, 'utf8');
    
    // Track successful operation
    trackUsage('create_file', executionTime, true, 1, fileSize);
    
    return {
      success: true,
      data: {
        path: filePath,
        size: fileSize,
        message: 'File created successfully'
      },
      executionTime,
      serverName: 'filesystem',
      toolName: 'create_file',
      metrics: {
        estimatedCost: fileSize * 0.0000001,
        filesProcessed: 1,
        totalBytes: fileSize
      }
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    // Track failed operation
    trackUsage('create_file', executionTime, false, 0, 0);
    
    throw error instanceof Error && error.name.startsWith('MCP')
      ? error
      : createMCPExecutionError('filesystem', 'create_file', error as Error);
  }
}

/**
 * Delete file
 */
export async function deleteFile(
  filePath: string,
  userId: string,
  createBackupFlag: boolean = true
): Promise<MCPToolResponse> {
  const startTime = Date.now();

  try {
    // Validate path safety
    validateFilePath(filePath, userId);
    
    // Create backup if requested
    let backupPath: string | undefined;
    if (createBackupFlag) {
      backupPath = await createBackup(filePath, userId);
    }
    
    // Delete file
    await fs.unlink(filePath);
    
    const executionTime = Date.now() - startTime;
    
    // Track successful operation
    trackUsage('delete_file', executionTime, true, 1, 0);
    
    return {
      success: true,
      data: {
        path: filePath,
        backupPath,
        message: 'File deleted successfully'
      },
      executionTime,
      serverName: 'filesystem',
      toolName: 'delete_file',
      metrics: {
        estimatedCost: 0,
        filesProcessed: 1,
        totalBytes: 0
      }
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    // Track failed operation
    trackUsage('delete_file', executionTime, false, 0, 0);
    
    throw error instanceof Error && error.name.startsWith('MCP')
      ? error
      : createMCPExecutionError('filesystem', 'delete_file', error as Error);
  }
}

/**
 * List directory contents
 */
export async function listDirectory(
  dirPath: string,
  userId: string,
  recursive: boolean = false
): Promise<MCPToolResponse> {
  const startTime = Date.now();

  try {
    // Validate path safety
    validateFilePath(dirPath, userId);
    
    // Check if path is a directory
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) {
      throw createMCPValidationError(
        'filesystem',
        'list_directory',
        `Path is not a directory: ${dirPath}`
      );
    }
    
    // List directory contents
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    const fileList = entries.map(entry => ({
      name: entry.name,
      type: entry.isDirectory() ? 'directory' : 'file',
      path: path.join(dirPath, entry.name)
    }));
    
    // If recursive, traverse subdirectories
    if (recursive) {
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subDirPath = path.join(dirPath, entry.name);
          try {
            const subEntries = await fs.readdir(subDirPath, { withFileTypes: true });
            const subList = subEntries.map(subEntry => ({
              name: subEntry.name,
              type: subEntry.isDirectory() ? 'directory' : 'file',
              path: path.join(subDirPath, subEntry.name)
            }));
            fileList.push(...subList);
          } catch (error) {
            // Skip inaccessible subdirectories
            console.warn(`Cannot access subdirectory: ${subDirPath}`, error);
          }
        }
      }
    }
    
    const executionTime = Date.now() - startTime;
    
    // Track successful operation
    trackUsage('list_directory', executionTime, true, fileList.length, 0);
    
    return {
      success: true,
      data: {
        path: dirPath,
        entries: fileList,
        count: fileList.length
      },
      executionTime,
      serverName: 'filesystem',
      toolName: 'list_directory',
      metrics: {
        estimatedCost: fileList.length * 0.000001,
        filesProcessed: fileList.length,
        totalBytes: 0
      }
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    // Track failed operation
    trackUsage('list_directory', executionTime, false, 0, 0);
    
    throw error instanceof Error && error.name.startsWith('MCP')
      ? error
      : createMCPExecutionError('filesystem', 'list_directory', error as Error);
  }
}

/**
 * Get file statistics
 */
export async function getFileStats(
  filePath: string,
  userId: string
): Promise<MCPToolResponse> {
  const startTime = Date.now();

  try {
    // Validate path safety
    validateFilePath(filePath, userId);
    
    // Get file stats
    const stats = await fs.stat(filePath);
    
    const executionTime = Date.now() - startTime;
    
    // Track successful operation
    trackUsage('get_stats', executionTime, true, 1, 0);
    
    return {
      success: true,
      data: {
        path: filePath,
        size: stats.size,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        accessedAt: stats.atime,
        permissions: stats.mode.toString(8)
      },
      executionTime,
      serverName: 'filesystem',
      toolName: 'get_stats',
      metrics: {
        estimatedCost: 0.000001,
        filesProcessed: 1,
        totalBytes: 0
      }
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    // Track failed operation
    trackUsage('get_stats', executionTime, false, 0, 0);
    
    throw error instanceof Error && error.name.startsWith('MCP')
      ? error
      : createMCPExecutionError('filesystem', 'get_stats', error as Error);
  }
}

/**
 * Check if filesystem tools are available
 */
export async function isFileSystemAvailable(): Promise<boolean> {
  try {
    // Test basic file system access
    const testPath = path.join(process.cwd(), 'test-access.tmp');
    await fs.writeFile(testPath, 'test', 'utf8');
    await fs.unlink(testPath);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get filesystem configuration
 */
export function getFileSystemConfig(): FileSystemConfig | null {
  return {
    name: 'filesystem',
    endpoint: 'local',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    poolSize: 10,
    capabilities: ['read_file', 'write_file', 'create_file', 'delete_file', 'list_directory', 'get_stats'],
    maxFileSize: MAX_FILE_SIZE_BYTES,
    allowedDirectories: ALLOWED_DIRECTORIES,
    backupDirectory: BACKUP_DIR,
    rateLimit: {
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxRequests: RATE_LIMIT_MAX_REQUESTS
    }
  };
}