I have the following user query that I want you to help me with. Please implement the requested functionality following best practices.

Create the user interface for monitoring autonomous agent execution:

- Build src/components/ai-agents/AutonomousAgentView.tsx with live progress display, step-by-step status, and file change preview
- Create src/components/ai-agents/PlanApprovalDialog.tsx for reviewing and approving generated plans
- Add src/components/ai-agents/FileDiffViewer.tsx to show code changes with syntax highlighting
- Implement Server-Sent Events (SSE) endpoint at src/app/api/ai/agents/stream/route.ts for real-time updates
- Update `/Users/codesleep/Desktop/agentsflowai.cloud/src/app/(dashboard)/ai-agents/playground/page.tsx` to use new autonomous agent UI components