I have the following verification comments after thorough review and exploration of the codebase. Implement the comments by following the instructions in the comments verbatim.

---
## Comment 1: executeToolChain loses tool parameters in routeMCPRequest query; uses taskId as userId.

You are tasked with completely resolving the tool execution issue in the autonomous agent orchestrator, incorporating the full review thread context.

**Original Issue Context**:
The original comment highlighted that `executeToolChain()` ignored planned `toolRoute`s/parameters by using generic queries in `routeMCPRequest()`, causing re-classification and wrong tool invocation.

**Current Partial State**:
- Descriptive query includes tool name/parameters as JSON string.
- `preferences: {maxTools:1, enableOrchestration:false}` limits to single tool.
- `request.context.parameters` set but ignored by router.
- `userId: taskId` (wrong; breaks auth/usage).

**Root Cause**: Reliance on `routeMCPRequest` intent classification discards planned routes/parameters. Tools get `{query: 'Execute X with params: {...}'}` instead of `{query: actualValue}`.

**Complete Solution Requirements**:
1. **Deterministic Execution**: Bypass classification; execute exact planned `toolRoute`s.
2. **Structured Parameters**: Pass `toolRoute.parameters` directly to tools.
3. **Correct userId**: Use `context.userId` for auth/quotas.
4. **Error Handling/Logging**: Preserve existing `logExecution`, retries, `MCPToolExecutionResult` format.
5. **Integration Fit**: Maintains MCP ecosystem; leverages `contextManager`; supports complexity-based plans.
6. **Backward Compat**: No breaking changes to public API (`createAutonomousTask` etc.).

**Concrete Implementation Steps**:
- Import `executeMCPTool` from `@/lib/mcp/tools/shared` and `MCPError` from `@/lib/mcp/errors` in `autonomous-agent-orchestrator.ts`.
- Update `executeToolChain(taskId: string, tools: MCPToolRoute[], userId: string)` signature.
- In loop:
  ```ts
  try {
    const params = toolRoute.parameters || {};
    const toolResult = await executeMCPTool(toolRoute.serverName, toolRoute.toolName, params, userId);
    const executionTime = Date.now() - start;
    // Build MCPToolExecutionResult
    const result: MCPToolExecutionResult = {
      toolRoute,
      success: toolResult.success,
      result: toolResult.data,
      cost: 0.001, // or estimate
      executionTime,
      retryCount: 0
    };
    // logExecution, update metadata.toolsUsed/totalCost
  } catch (error) { /* handle, log, result with error */ }
  ```
- In `handleExecutingState()`: `await this.executeToolChain(taskId, step.tools, context.userId);`
- Add retry logic (max 3) with exponential backoff.
- Estimate cost based on toolName (e.g., search:0.001, playwright:0.005).
- Test with `generateExecutionPlan` hardcoded tools.

**Engineer Instructions**:
In `src/server-lib/autonomous-agent-orchestrator.ts`, `executeToolChain()` sends descriptive query to `routeMCPRequest` losing `toolRoute.parameters` structure.
Import `executeMCPTool` from `@/lib/mcp/tools/shared` and call directly: `await executeMCPTool(serverName, toolName, parameters || {}, userId)` capturing `executionTime`/`success`/`data`.
Update signature to accept `userId: string`; call from `handleExecutingState(context.userId)`.
Map response to `MCPToolExecutionResult`; retain `logExecution`/`metadata` updates; add try-catch for `MCPError`.

### Referred Files
- /Users/codesleep/Desktop/agentsflowai.cloud/src/server-lib/autonomous-agent-orchestrator.ts
---