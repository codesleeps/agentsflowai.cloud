"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Activity,
  Clock,
  Server,
  Download,
} from "lucide-react";

interface ProviderStatus {
  status: "healthy" | "degraded" | "unhealthy";
  latency_ms?: number;
  available_models?: string[];
  model?: string;
  error?: string;
}

interface HealthCheckResponse {
  timestamp: string;
  overall_status: "healthy" | "degraded" | "unhealthy";
  providers: {
    ollama: ProviderStatus;
    google: ProviderStatus;
    anthropic: ProviderStatus;
    openai: ProviderStatus;
    openrouter: ProviderStatus;
  };
  environment: {
    ollama_configured: boolean;
    google_key_configured: boolean;
    anthropic_key_configured: boolean;
    openai_key_configured: boolean;
    openrouter_key_configured: boolean;
  };
}

interface DiagnosticLog {
  id: string;
  provider: string;
  model: string;
  status: "success" | "failed";
  latency_ms: number;
  error_message?: string;
  created_at: string;
}

const fetchHealthCheck = async (): Promise<HealthCheckResponse> => {
  const res = await fetch("/api/ai/health-check");
  if (!res.ok) throw new Error("Failed to fetch health check");
  return res.json();
};

const fetchDiagnosticHistory = async (): Promise<DiagnosticLog[]> => {
  const res = await fetch("/api/ai/diagnostics?limit=20");
  if (!res.ok) throw new Error("Failed to fetch diagnostic history");
  return res.json();
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "healthy":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case "degraded":
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case "unhealthy":
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <XCircle className="h-5 w-5 text-gray-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "healthy":
      return "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30";
    case "degraded":
      return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30";
    case "unhealthy":
      return "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30";
    default:
      return "bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/30";
  }
};

const ProviderCard = ({
  name,
  status,
  onTest,
  isTesting,
}: {
  name: string;
  status: ProviderStatus;
  onTest: () => void;
  isTesting: boolean;
}) => (
  <Card>
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          {getStatusIcon(status.status)}
          {name}
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={onTest}
          disabled={isTesting}
        >
          {isTesting ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Activity className="h-4 w-4 mr-2" />
          )}
          Test Now
        </Button>
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge className={getStatusColor(status.status)}>
          {status.status}
        </Badge>
        {status.latency_ms && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            {status.latency_ms}ms
          </div>
        )}
      </div>

      {status.model && (
        <div className="text-sm">
          <span className="font-medium">Model:</span> {status.model}
        </div>
      )}

      {status.available_models && status.available_models.length > 0 && (
        <div className="text-sm">
          <span className="font-medium">Available Models:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {status.available_models.slice(0, 5).map((model) => (
              <Badge key={model} variant="secondary" className="text-xs">
                {model}
              </Badge>
            ))}
            {status.available_models.length > 5 && (
              <Badge variant="secondary" className="text-xs">
                +{status.available_models.length - 5} more
              </Badge>
            )}
          </div>
        </div>
      )}

      {status.error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-2 rounded">
          <span className="font-medium">Error:</span> {status.error}
        </div>
      )}
    </CardContent>
  </Card>
);

export default function DiagnosticsPage() {
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  const {
    data: healthData,
    isLoading,
    error,
    refetch: refetchHealth,
  } = useQuery({
    queryKey: ["aiHealthCheck"],
    queryFn: fetchHealthCheck,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const {
    data: historyData,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["diagnosticHistory"],
    queryFn: fetchDiagnosticHistory,
  });

  const handleRefresh = async () => {
    try {
      await refetchHealth();
      await refetchHistory();
      toast.success("Diagnostics refreshed");
    } catch (error) {
      toast.error("Failed to refresh diagnostics");
    }
  };

  const handleTestProvider = async (providerName: string) => {
    setTestingProvider(providerName);
    try {
      await refetchHealth();
      toast.success(`${providerName} test completed`);
    } catch (error) {
      toast.error(`Failed to test ${providerName}`);
    } finally {
      setTestingProvider(null);
    }
  };

  const handleExportDiagnostics = () => {
    if (!healthData) return;

    const dataStr = JSON.stringify(healthData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `ai-diagnostics-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (isLoading && !healthData) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-lg font-medium">Failed to load diagnostics</p>
              <p className="text-muted-foreground">Please try again later</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            AI Provider Diagnostics
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor the health and performance of your AI providers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportDiagnostics}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(healthData?.overall_status || "unhealthy")}
            Overall System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge className={getStatusColor(healthData?.overall_status || "unhealthy")}>
              {healthData?.overall_status || "unknown"}
            </Badge>
            <div className="text-sm text-muted-foreground">
              Last updated: {healthData?.timestamp ? new Date(healthData.timestamp).toLocaleString() : "Never"}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="providers" className="space-y-6">
        <TabsList>
          <TabsTrigger value="providers">Provider Status</TabsTrigger>
          <TabsTrigger value="history">Recent Tests</TabsTrigger>
          <TabsTrigger value="environment">Environment</TabsTrigger>
        </TabsList>

        <TabsContent value="providers">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ProviderCard
              name="Ollama"
              status={healthData?.providers.ollama || { status: "unhealthy" }}
              onTest={() => handleTestProvider("ollama")}
              isTesting={testingProvider === "ollama"}
            />
            <ProviderCard
              name="Google Gemini"
              status={healthData?.providers.google || { status: "unhealthy" }}
              onTest={() => handleTestProvider("google")}
              isTesting={testingProvider === "google"}
            />
            <ProviderCard
              name="Anthropic Claude"
              status={healthData?.providers.anthropic || { status: "unhealthy" }}
              onTest={() => handleTestProvider("anthropic")}
              isTesting={testingProvider === "anthropic"}
            />
            <ProviderCard
              name="OpenAI"
              status={healthData?.providers.openai || { status: "unhealthy" }}
              onTest={() => handleTestProvider("openai")}
              isTesting={testingProvider === "openai"}
            />
            <ProviderCard
              name="OpenRouter"
              status={healthData?.providers.openrouter || { status: "unhealthy" }}
              onTest={() => handleTestProvider("openrouter")}
              isTesting={testingProvider === "openrouter"}
            />
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Recent Diagnostic Tests</CardTitle>
            </CardHeader>
            <CardContent>
              {historyData && historyData.length > 0 ? (
                <div className="space-y-2">
                  {historyData.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(log.status)}
                        <div>
                          <div className="font-medium">{log.provider} - {log.model}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-muted-foreground">
                          {log.latency_ms}ms
                        </div>
                        {log.error_message && (
                          <div className="text-sm text-red-600 max-w-xs truncate">
                            {log.error_message}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No diagnostic history available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="environment">
          <Card>
            <CardHeader>
              <CardTitle>Environment Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(healthData?.environment || {}).map(([key, configured]) => (
                  <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4" />
                      <span className="font-medium">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                    <Badge className={configured ? getStatusColor("healthy") : getStatusColor("unhealthy")}>
                      {configured ? "Configured" : "Not Configured"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}