
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AIAgent, AIProvider } from '@/shared/models/ai-agents';

interface ModelSelectorProps {
  agent: AIAgent;
  onModelChange: (provider: AIProvider, model: string) => void;
}

export function ModelSelector({ agent, onModelChange }: ModelSelectorProps) {
  const [selectedProvider, setSelectedProvider] = useState(agent.defaultProvider);

  const handleProviderChange = (value: string) => {
    const provider = value as AIProvider;
    setSelectedProvider(provider);
    const selectedModel = agent.supportedProviders.find(p => p.provider === provider)?.model || agent.model;
    onModelChange(provider, selectedModel);
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedProvider} onValueChange={handleProviderChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          {agent.supportedProviders.map(({ provider, model, priority }) => (
            <SelectItem key={provider} value={provider}>
              <div className="flex justify-between w-full">
                <span>{provider} ({model})</span>
                <Badge variant={priority === 1 ? 'default' : 'secondary'}>
                  {priority === 1 ? 'Primary' : `Fallback ${priority}`}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Badge variant="outline">{agent.costTier}</Badge>
    </div>
  );
}
