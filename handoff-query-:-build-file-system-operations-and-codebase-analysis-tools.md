I have the following user query that I want you to help me with. Please implement the requested functionality following best practices.

Implement file system capabilities and codebase understanding:

- Create src/lib/mcp/tools/filesystem.ts with read, write, create, delete operations using Node.js `fs` module
- Build src/lib/mcp/tools/codebase-search.ts for finding relevant files, analyzing project structure, and understanding dependencies
- Add safety checks: file size limits, allowed directories, backup creation before modifications
- Integrate with existing MCP tool execution pattern from `/Users/codesleep/Desktop/agentsflowai.cloud/src/lib/mcp/tools/shared.ts` using `executeMCPTool`
- Create file diff generator for showing changes before applying them