I have the following user query that I want you to help me with. Please implement the requested functionality following best practices.

Build the core orchestration engine for autonomous task execution:

- Create src/server-lib/autonomous-agent-orchestrator.ts with task breakdown, planning, and execution coordination logic
- Implement complexity detection algorithm (simple/medium/complex) based on task analysis
- Add state machine for agent workflow: `analyze → plan → approve → execute → verify → complete`
- Integrate with existing `routeMCPRequest` from `/Users/codesleep/Desktop/agentsflowai.cloud/src/server-lib/mcp-router-agent.ts` for tool routing
- Create task context manager to maintain state across multi-step executions