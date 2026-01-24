import { Metadata } from 'next';
import { AutonomousOrchestratorUI } from '@/components/orchestrator/AutonomousOrchestratorUI';

export const metadata: Metadata = {
  title: 'Autonomous Orchestrator | AgentsFlowAI',
  description: 'Manage autonomous AI agent workflows with automatic complexity analysis and execution planning.',
};

export default function AutonomousOrchestratorPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Autonomous Agent Orchestrator</h1>
        <p className="text-muted-foreground mt-2">
          Create and manage autonomous AI workflows with intelligent task analysis and approval workflows.
        </p>
      </div>
      
      <AutonomousOrchestratorUI />
      
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border rounded-lg p-6">
          <h3 className="font-semibold mb-2">Smart Complexity Analysis</h3>
          <p className="text-sm text-muted-foreground">
            Automatically analyzes task complexity and estimates required steps and resources.
          </p>
        </div>
        
        <div className="border rounded-lg p-6">
          <h3 className="font-semibold mb-2">Approval Workflows</h3>
          <p className="text-sm text-muted-foreground">
            Safety-first approach with human approval required for complex or high-risk tasks.
          </p>
        </div>
        
        <div className="border rounded-lg p-6">
          <h3 className="font-semibold mb-2">Real-time Monitoring</h3>
          <p className="text-sm text-muted-foreground">
            Track execution progress, costs, and performance metrics in real-time.
          </p>
        </div>
      </div>
    </div>
  );
}