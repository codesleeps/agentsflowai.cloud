"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Bot,
  MessageSquare,
  Mail,
  Calendar,
  FileText,
  Database,
  Globe,
  Sparkles,
  Plus,
  GripVertical,
  Trash2,
  Settings,
  Play,
  Save,
  ArrowRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Workflow Node Types
interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
}

interface NodeType {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  category: string;
  defaultConfig: Record<string, unknown>;
}

const NODE_TYPES: NodeType[] = [
  // Triggers
  {
    id: "trigger-schedule",
    name: "Schedule Trigger",
    icon: <Calendar className="h-4 w-4" />,
    description: "Run on a schedule",
    category: "Triggers",
    defaultConfig: { schedule: "0 9 * * *", timezone: "UTC" },
  },
  {
    id: "trigger-webhook",
    name: "Webhook Trigger",
    icon: <Globe className="h-4 w-4" />,
    description: "Trigger via HTTP webhook",
    category: "Triggers",
    defaultConfig: { method: "POST", path: "/webhook" },
  },
  // AI Actions
  {
    id: "ai-chat",
    name: "AI Chat",
    icon: <MessageSquare className="h-4 w-4" />,
    description: "Send message to AI",
    category: "AI",
    defaultConfig: { model: "gpt-4o-mini", prompt: "", systemPrompt: "" },
  },
  {
    id: "ai-summarize",
    name: "AI Summarize",
    icon: <FileText className="h-4 w-4" />,
    description: "Summarize text content",
    category: "AI",
    defaultConfig: { maxLength: 200 },
  },
  {
    id: "ai-classify",
    name: "AI Classify",
    icon: <Sparkles className="h-4 w-4" />,
    description: "Classify content into categories",
    category: "AI",
    defaultConfig: { categories: ["positive", "negative", "neutral"] },
  },
  // Data Actions
  {
    id: "data-transform",
    name: "Transform Data",
    icon: <Database className="h-4 w-4" />,
    description: "Transform data format",
    category: "Data",
    defaultConfig: { transform: "json" },
  },
  {
    id: "data-filter",
    name: "Filter Data",
    icon: <Database className="h-4 w-4" />,
    description: "Filter based on conditions",
    category: "Data",
    defaultConfig: { condition: "equals", field: "", value: "" },
  },
  // Communication
  {
    id: "send-email",
    name: "Send Email",
    icon: <Mail className="h-4 w-4" />,
    description: "Send an email",
    category: "Communication",
    defaultConfig: { to: "", subject: "", body: "" },
  },
  {
    id: "send-sms",
    name: "Send SMS",
    icon: <MessageSquare className="h-4 w-4" />,
    description: "Send SMS via Twilio",
    category: "Communication",
    defaultConfig: { to: "", message: "" },
  },
];

// Sortable Node Component
interface SortableNodeProps {
  node: WorkflowNode;
  onUpdate: (id: string, config: Record<string, unknown>) => void;
  onRemove: (id: string) => void;
}

function SortableNode({ node, onUpdate, onRemove }: SortableNodeProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const nodeType = NODE_TYPES.find((t) => t.id === node.type);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card border rounded-lg p-4 mb-3 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="flex items-center gap-2 flex-1">
          <div className="p-2 bg-primary/10 rounded-md">
            {nodeType?.icon || <Bot className="h-4 w-4" />}
          </div>
          <div>
            <p className="font-medium">{nodeType?.name || node.type}</p>
            <p className="text-xs text-muted-foreground">
              {nodeType?.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onRemove(node.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Node Configuration */}
      <div className="mt-3 pt-3 border-t">
        {node.type === "ai-chat" && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Model</Label>
              <Select
                value={(node.config.model as string) || "gpt-4o-mini"}
                onValueChange={(v) =>
                  onUpdate(node.id, { ...node.config, model: v })
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                  <SelectItem value="deepseek-chat">DeepSeek Chat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Prompt Template</Label>
              <Textarea
                value={(node.config.prompt as string) || ""}
                onChange={(e) =>
                  onUpdate(node.id, { ...node.config, prompt: e.target.value })
                }
                placeholder="Use {{variable}} for dynamic content"
                className="h-20 text-sm"
              />
            </div>
          </div>
        )}

        {node.type === "send-email" && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">To</Label>
              <Input
                value={(node.config.to as string) || ""}
                onChange={(e) =>
                  onUpdate(node.id, { ...node.config, to: e.target.value })
                }
                placeholder="recipient@example.com"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Subject</Label>
              <Input
                value={(node.config.subject as string) || ""}
                onChange={(e) =>
                  onUpdate(node.id, { ...node.config, subject: e.target.value })
                }
                placeholder="Email subject"
                className="h-8 text-sm"
              />
            </div>
          </div>
        )}

        {node.type === "trigger-schedule" && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Cron Schedule</Label>
              <Input
                value={(node.config.schedule as string) || ""}
                onChange={(e) =>
                  onUpdate(node.id, { ...node.config, schedule: e.target.value })
                }
                placeholder="0 9 * * *"
                className="h-8 text-sm font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Format: minute hour day month weekday
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Main Builder Component
export function DragDropWorkflowBuilder() {
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [workflowName, setWorkflowName] = useState("New Workflow");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const categories = ["All", ...new Set(NODE_TYPES.map((t) => t.category))];

  const filteredNodeTypes =
    selectedCategory === "All"
      ? NODE_TYPES
      : NODE_TYPES.filter((t) => t.category === selectedCategory);

  const addNode = (nodeType: NodeType) => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type: nodeType.id,
      name: nodeType.name,
      config: { ...nodeType.defaultConfig },
    };
    setNodes((prev) => [...prev, newNode]);
    toast.success(`${nodeType.name} added`);
  };

  const updateNode = (id: string, config: Record<string, unknown>) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, config } : n))
    );
  };

  const removeNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setNodes((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }

    setActiveId(null);
  };

  const saveWorkflow = () => {
    const workflow = {
      name: workflowName,
      nodes,
      createdAt: new Date().toISOString(),
    };
    console.log("Saving workflow:", workflow);
    toast.success("Workflow saved!");
  };

  const runWorkflow = () => {
    toast.info("Running workflow...");
    // TODO: Implement workflow execution
  };

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: "0.5",
        },
      },
    }),
  };

  return (
    <div className="flex h-[calc(100vh-200px)] gap-4">
      {/* Sidebar - Node Types */}
      <Card className="w-64 flex-shrink-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Nodes</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="mb-3 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Node Type List */}
          <div className="space-y-2">
            {filteredNodeTypes.map((nodeType) => (
              <button
                key={nodeType.id}
                onClick={() => addNode(nodeType)}
                className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent text-left transition-colors"
              >
                <div className="p-1.5 bg-primary/10 rounded">
                  {nodeType.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{nodeType.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {nodeType.description}
                  </p>
                </div>
                <Plus className="h-3 w-3 text-muted-foreground" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Canvas */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Input
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="w-64 font-semibold"
              />
              <Badge variant="secondary">{nodes.length} nodes</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={saveWorkflow}>
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button size="sm" onClick={runWorkflow}>
                <Play className="h-4 w-4 mr-1" />
                Run
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto p-4">
          {nodes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Bot className="h-12 w-12 mb-4 opacity-20" />
              <p>Drag nodes from the sidebar to build your workflow</p>
              <p className="text-sm">or click on a node type to add it</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={nodes.map((n) => n.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="max-w-2xl mx-auto">
                  {nodes.map((node, index) => (
                    <div key={node.id}>
                      {index > 0 && (
                        <div className="flex justify-center py-2">
                          <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
                        </div>
                      )}
                      <SortableNode
                        node={node}
                        onUpdate={updateNode}
                        onRemove={removeNode}
                      />
                    </div>
                  ))}
                </div>
              </SortableContext>

              <DragOverlay dropAnimation={dropAnimation}>
                {activeId ? (
                  <div className="bg-card border rounded-lg p-4 shadow-lg opacity-80">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {
                          NODE_TYPES.find(
                            (t) =>
                              t.id === nodes.find((n) => n.id === activeId)?.type
                          )?.name
                        }
                      </span>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
