I have the following user query that I want you to help me with. Please implement the requested functionality following best practices.

Connect all components and expose autonomous capabilities through the existing agent API:

- Update `/Users/codesleep/Desktop/agentsflowai.cloud/src/app/api/ai/agents/route.ts` POST endpoint to detect autonomous task requests and route to orchestrator
- Add new endpoint src/app/api/ai/agents/autonomous/route.ts for plan approval and execution control
- Modify web dev agent configuration in `/Users/codesleep/Desktop/agentsflowai.cloud/src/shared/models/ai-agents.ts` to include autonomous capabilities
- Update `/Users/codesleep/Desktop/agentsflowai.cloud/src/client-lib/ai-agents-client.ts` with functions: `createAutonomousTask()`, `approvePlan()`, `executeTask()`, `rollbackChanges()`
- Add database models for storing autonomous task history (extend `WorkflowExecution` or create new table)