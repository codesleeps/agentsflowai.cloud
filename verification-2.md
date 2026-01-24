I have the following verification comments after thorough review and exploration of the codebase. Implement the comments by following the instructions in the comments verbatim.

---
## Comment 1: Autonomous task API routes still import the simplified orchestrator, leaving the new state-machine implementation unused.

Update the autonomous task API routes to import `createAutonomousTask`, `getTaskStatus`, `approveTask`, and `cancelTask` from `src/server-lib/autonomous-agent-orchestrator.ts` and remove or deprecate `src/server-lib/simple-autonomous-orchestrator.ts` to avoid divergent behavior.

### Referred Files
- /Users/codesleep/Desktop/agentsflowai.cloud/src/app/api/autonomous/tasks/route.ts
- /Users/codesleep/Desktop/agentsflowai.cloud/src/app/api/autonomous/tasks/[taskId]/[action]/route.ts
- /Users/codesleep/Desktop/agentsflowai.cloud/src/server-lib/simple-autonomous-orchestrator.ts
- /Users/codesleep/Desktop/agentsflowai.cloud/src/server-lib/autonomous-agent-orchestrator.ts
---