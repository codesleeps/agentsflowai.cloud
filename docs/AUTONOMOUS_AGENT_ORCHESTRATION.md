# Autonomous Agent Orchestration System

## Overview

This system enables autonomous, multi-step task execution through intelligent orchestration of AI agents and MCP tools. Built on a state machine architecture with progressive complexity detection and robust error handling.

## Key Features

- **State Machine Orchestration**: Deterministic task execution through well-defined states
- **Complexity Detection**: AI-powered analysis to determine execution strategy
- **MCP Integration**: Seamless integration with existing Model Context Protocol tools
- **Persistent State Management**: Database-backed execution tracking with Redis caching
- **Real-time Monitoring**: Live task status updates and progress tracking
- **Flexible Control**: Approve, pause, resume, cancel, and retry capabilities

## Architecture

### Core Components

1. **AutonomousAgentOrchestrator** (`src/server-lib/autonomous-agent-orchestrator.ts`)
   - Main orchestration engine
   - State machine management
   - Task lifecycle coordination

2. **Task Complexity Analyzer**
   - AI-powered complexity detection
   - Pattern-based fallback analysis
   - Caching for performance

3. **Task Context Manager**
   - Persistent context storage
   - Redis caching layer
   - State synchronization

4. **API Endpoints**
   - `/api/autonomous/tasks` - Task creation and status
   - `/api/autonomous/tasks/[taskId]/[action]` - Task control actions

### State Machine

```mermaid
stateDiagram-v2
    [*] --> ANALYZING: initializeTask()
    ANALYZING --> PLANNING: detectComplexity()
    PLANNING --> AWAITING_APPROVAL: generatePlan()
    AWAITING_APPROVAL --> EXECUTING: approveTask()
    AWAITING_APPROVAL --> CANCELLED: cancelTask()
    EXECUTING --> VERIFYING: executeToolChain()
    EXECUTING --> PAUSED: pauseTask()
    PAUSED --> EXECUTING: resumeTask()
    PAUSED --> CANCELLED: cancelTask()
    VERIFYING --> COMPLETED: validation success
    VERIFYING --> FAILED: validation failed
    VERIFYING --> EXECUTING: retry on recoverable error
    COMPLETED --> [*]
    FAILED --> [*]
    CANCELLED --> [*]
```

## Installation & Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis server
- Ollama (for local AI models)
- Access to OpenRouter API

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/agentsflowai

# Redis
REDIS_URL=redis://localhost:6379

# AI Providers
OLLAMA_BASE_URL=http://localhost:11434
OPENROUTER_API_KEY=your-openrouter-key
ANTHROPIC_API_KEY=your-anthropic-key

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database Migration

Ensure the following tables exist in your Prisma schema:

```prisma
model WorkflowExecution {
  id           String     @id @default(uuid())
  user_id      String
  workflow_id  String
  status       String     // running, completed, failed, cancelled
  trigger_data Json
  result_data  Json
  started_at   DateTime   @default(now())
  finished_at  DateTime?
  created_at   DateTime   @default(now())
  updated_at   DateTime   @updatedAt

  logs WorkflowExecutionLog[]
}

model WorkflowExecutionLog {
  id           String   @id @default(uuid())
  execution_id String
  action_type  String
  input_data   Json
  output_data  Json
  timestamp    DateTime @default(now())

  execution WorkflowExecution @relation(fields: [execution_id], references: [id])
}
```

Run migrations:
```bash
npx prisma migrate dev
```

## Usage

### Backend API

#### Create Autonomous Task
```typescript
import { createAutonomousTask } from '@/server-lib/autonomous-agent-orchestrator';

const taskId = await createAutonomousTask(
  userId, 
  agentId, 
  "Build a premium landing page for VoltAI electric vehicles"
);
```

#### Get Task Status
```typescript
import { getTaskStatus } from '@/server-lib/autonomous-agent-orchestrator';

const status = await getTaskStatus(taskId);
console.log(status.currentState); // 'EXECUTING'
console.log(status.progress.percentage); // 65
```

#### Control Task Execution
```typescript
import { 
  approveTask, 
  cancelTask, 
  pauseTask, 
  resumeTask, 
  retryTask 
} from '@/server-lib/autonomous-agent-orchestrator';

// Approve task awaiting approval
await approveTask(taskId);

// Pause executing task
await pauseTask(taskId);

// Resume paused task
await resumeTask(taskId);

// Cancel running task
await cancelTask(taskId);

// Retry failed task
await retryTask(taskId);
```

### Frontend Integration

#### Using Client Library
```typescript
import { 
  createAutonomousTask, 
  getAutonomousTaskStatus 
} from '@/client-lib/autonomous-agents-client';

// Create task
const { taskId } = await createAutonomousTask(
  'web-development-agent',
  'Create a responsive navbar component'
);

// Monitor status
const status = await getAutonomousTaskStatus(taskId);
```

#### Using React Hooks
```tsx
import { useAutonomousTask, useAutonomousTaskStatus } from '@/client-lib/autonomous-agents-client';

function TaskComponent() {
  const { createTask, isCreating, error } = useAutonomousTask();
  const { status, isLoading } = useAutonomousTaskStatus(taskId);

  const handleCreateTask = async () => {
    const result = await createTask('agent-id', 'Your prompt here');
    setTaskId(result.taskId);
  };

  if (isLoading) return <div>Loading...</div>;
  if (status) return <TaskStatusDisplay status={status} />;
}
```

#### Using React Components
```tsx
import { 
  AutonomousTaskCreator, 
  AutonomousTaskMonitor 
} from '@/components/autonomous-task-monitor';

function TaskDashboard() {
  const [taskId, setTaskId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <AutonomousTaskCreator 
        agentId="web-development-agent"
        onTaskCreated={setTaskId}
      />
      
      {taskId && (
        <AutonomousTaskMonitor taskId={taskId} />
      )}
    </div>
  );
}
```

### REST API Endpoints

#### Create Task
```bash
POST /api/autonomous/tasks
Content-Type: application/json

{
  "agentId": "web-development-agent",
  "prompt": "Build a premium landing page for VoltAI"
}
```

Response:
```json
{
  "taskId": "task_1704123456789_abc123",
  "status": "initialized",
  "message": "Autonomous task created and started"
}
```

#### Get Task Status
```bash
GET /api/autonomous/tasks?taskId=task_1704123456789_abc123
```

Response:
```json
{
  "taskId": "task_1704123456789_abc123",
  "currentState": "EXECUTING",
  "originalPrompt": "Build a premium landing page...",
  "complexity": {
    "level": "complex",
    "score": 85,
    "estimatedSteps": 12,
    "reasoning": "Multi-component feature with external integrations"
  },
  "progress": {
    "percentage": 65,
    "completedSteps": 8,
    "totalSteps": 12,
    "estimatedTimeRemaining": 180
  },
  "metadata": {
    "startTime": "2024-01-01T10:30:00Z",
    "toolsUsed": ["context7.search", "fetch.extract"],
    "totalCost": 0.0042,
    "totalDuration": 420
  }
}
```

#### Control Task Actions
```bash
POST /api/autonomous/tasks/task_1704123456789_abc123/approve
POST /api/autonomous/tasks/task_1704123456789_abc123/cancel
POST /api/autonomous/tasks/task_1704123456789_abc123/pause
POST /api/autonomous/tasks/task_1704123456789_abc123/resume
POST /api/autonomous/tasks/task_1704123456789_abc123/retry
```

## Complexity Levels

### Simple Tasks (0-30 points)
- Single-file changes
- Basic queries and updates
- Straightforward operations

**Example prompts:**
- "Fix the typo in the header component"
- "Update the button color to blue"
- "Change the navigation text"

### Medium Tasks (31-70 points)
- Multi-file changes
- Feature additions
- Moderate refactoring

**Example prompts:**
- "Add a contact form to the landing page"
- "Create a new user profile component"
- "Implement dark mode toggle"

### Complex Tasks (71-100 points)
- Full feature development
- Architectural changes
- Multi-system integration

**Example prompts:**
- "Build a complete e-commerce checkout flow"
- "Integrate Stripe payment processing"
- "Create a real-time chat system"

## Error Handling & Recovery

### Automatic Retries
- Tool execution failures: Up to 3 automatic retries with exponential backoff
- Network timeouts: Smart retry logic with increasing delays
- Rate limiting: Automatic backoff when hitting provider limits

### Manual Recovery Options
- **Retry**: Restart failed tasks from the beginning
- **Pause/Resume**: Temporarily halt and resume execution
- **Cancel**: Stop execution and clean up resources

### Monitoring & Logging
- Detailed execution logs in `WorkflowExecutionLog`
- Real-time status updates via WebSocket
- Comprehensive error reporting with context

## Performance Optimization

### Caching Strategy
- Redis caching for task contexts (1-hour TTL)
- Complexity analysis results caching
- Frequently accessed task metadata

### Resource Management
- Concurrent execution limits
- Memory usage monitoring
- Database connection pooling

### Scalability Features
- Horizontal scaling support
- Load balancing capabilities
- Distributed task queuing

## Security Considerations

### Authentication
- All API endpoints require user authentication
- Task ownership verification
- Role-based access control

### Input Validation
- Prompt length limits (10,000 characters)
- Sanitization of user inputs
- Rate limiting protection

### Data Protection
- Encrypted database storage
- Secure API key management
- Audit logging for all operations

## Testing

### Unit Tests
```bash
npm run test:unit -- autonomous-agent-orchestrator
```

### Integration Tests
```bash
npm run test:integration -- autonomous-tasks
```

### End-to-End Tests
```bash
npm run test:e2e -- autonomous-workflows
```

## Monitoring & Metrics

### Key Metrics Tracked
- Task success/failure rates
- Average execution time by complexity
- Tool usage statistics
- Cost analysis by provider
- Error frequency and types

### Health Checks
```bash
GET /api/autonomous/health
```

### Performance Dashboard
- Real-time task execution metrics
- Resource utilization graphs
- Error trend analysis
- Cost optimization suggestions

## Troubleshooting

### Common Issues

**Task stuck in ANALYZING state:**
- Check AI provider connectivity
- Verify API keys are configured
- Review logs for specific errors

**MCP tool execution failures:**
- Confirm MCP servers are running
- Check tool parameter validation
- Review server connection settings

**Database connection issues:**
- Verify PostgreSQL is accessible
- Check connection pool settings
- Review Prisma schema migrations

### Debugging Commands

```bash
# View recent task executions
npm run debug:recent-tasks

# Check orchestrator health
npm run debug:orchestrator-health

# View detailed task logs
npm run debug:task-logs -- taskId
```

## Contributing

### Development Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Run database migrations: `npx prisma migrate dev`
5. Start development server: `npm run dev`

### Code Structure
- `src/server-lib/autonomous-agent-orchestrator.ts` - Core orchestration logic
- `src/app/api/autonomous/` - API route handlers
- `src/client-lib/autonomous-agents-client.ts` - Client-side utilities
- `src/components/autonomous-task-monitor.tsx` - UI components

### Testing Guidelines
- Write unit tests for new functionality
- Include integration tests for API endpoints
- Maintain test coverage above 80%
- Document breaking changes

## Roadmap

### Phase 1 ✅ (Current)
- Basic orchestration engine
- State machine implementation
- Complexity detection
- Core API endpoints

### Phase 2 🚀 (Planned)
- Advanced planning algorithms
- Multi-agent collaboration
- Enhanced error recovery
- Performance optimization

### Phase 3 🔮 (Future)
- Natural language task decomposition
- Self-healing capabilities
- Cross-platform deployment
- Enterprise features

## Support

For issues, questions, or feature requests:
- GitHub Issues: [repository-url/issues](#)
- Discord: [discord.gg/community](#)
- Documentation: [docs.autonomous-agents.dev](#)

---

*Built with ❤️ for the AgentsFlowAI community*