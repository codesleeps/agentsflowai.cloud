import { Metadata } from 'next';
import { AutonomousOrchestratorUI } from '@/components/orchestrator/AutonomousOrchestratorUI';
import { Rocket, Flame, Brain } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Autonomous Orchestrator | AgentsFlowAI',
  description: 'Manage autonomous AI agent workflows with Kimi K2.5 orchestration, swarm mode, and intelligent task analysis.',
};

export default function AutonomousOrchestratorPage() {
  return (
    <div className="container mx-auto py-8 max-w-full overflow-x-hidden">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold tracking-tight">Autonomous Agent Orchestrator</h1>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full text-white text-sm font-medium">
            <Rocket className="h-4 w-4" />
            <span>Kimi K2.5</span>
          </div>
        </div>
        <p className="text-muted-foreground mt-2">
          Create and manage autonomous AI workflows with advanced Kimi K2.5 orchestration, 
          parallel agent swarm technology, and intelligent task analysis.
        </p>
      </div>
      
      <AutonomousOrchestratorUI />
      
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-5 w-5 text-indigo-500" />
            <h3 className="font-semibold">Kimi K2.5 Powered Analysis</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Advanced AI-powered complexity analysis with automatic swarm mode detection 
            for high-complexity tasks.
          </p>
        </div>
        
        <div className="border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <h3 className="font-semibold">Agent Swarm Mode</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            For complex tasks (score &gt; 70), activate 100 parallel agents for up to 4.5x speedup.
          </p>
        </div>
        
        <div className="border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <Rocket className="h-5 w-5 text-green-500" />
            <h3 className="font-semibold">Intelligent Orchestration</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Smart execution planning with real-time monitoring and automatic error recovery.
          </p>
        </div>
      </div>
    </div>
  );
}