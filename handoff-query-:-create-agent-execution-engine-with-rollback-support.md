I have the following user query that I want you to help me with. Please implement the requested functionality following best practices.

Build the execution engine that applies planned changes with safety mechanisms:

- Create src/server-lib/agent-executor.ts that executes approved plans step-by-step
- Implement transaction-like rollback using Git operations or file backups before each change
- Add execution logging to `WorkflowExecutionLog` table in database (already exists in `/Users/codesleep/Desktop/agentsflowai.cloud/prisma/schema.prisma`)
- Integrate file system tools from previous phase for actual code modifications
- Create verification step that checks if changes compile/run successfully using basic syntax validation