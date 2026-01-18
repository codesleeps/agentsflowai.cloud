import React from "react";
import Link from "next/link";

export default function AIProvidersDocsPage() {
  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="mb-8">
        <Link href="/docs" className="text-sm text-muted-foreground hover:text-primary mb-4 inline-block">
          ← Back to Documentation
        </Link>
        <h1 className="text-4xl font-bold tracking-tight mb-2">AI Providers Setup</h1>
        <p className="text-xl text-muted-foreground">
          Configure and manage AI providers for your agents.
        </p>
      </div>

      <div className="grid gap-8">
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2">Overview</h2>
          <p>
            AgentsFlowAI supports multiple AI providers to ensure reliability and flexibility. 
            You can configure multiple providers to create a robust fallback chain, ensuring your 
            agents continue to work even if one provider experiences downtime.
          </p>
          <div className="bg-muted p-4 rounded-lg border">
            <h3 className="font-medium mb-2">Recommended Setup</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>Primary:</strong> Google Gemini (Fast, reliable, generous free tier)</li>
              <li><strong>Secondary:</strong> OpenAI (Industry standard, high quality)</li>
              <li><strong>Fallback:</strong> Ollama (Local, free, offline capable)</li>
            </ul>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold border-b pb-2">Supported Providers</h2>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Google Gemini */}
            <div className="border rounded-lg p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-medium">Google Gemini</h3>
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">Recommended</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Powered by Google's Gemini Pro and Flash models. Excellent balance of speed and reasoning.
              </p>
              <div className="bg-slate-950 text-slate-50 p-3 rounded text-xs font-mono">
                GOOGLE_API_KEY=AIzaSy...
              </div>
              <a 
                href="https://makersuite.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline inline-block"
              >
                Get API Key →
              </a>
            </div>

            {/* OpenAI */}
            <div className="border rounded-lg p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-medium">OpenAI</h3>
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Standard</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Industry standard GPT-4o and GPT-3.5 models. High reliability and quality.
              </p>
              <div className="bg-slate-950 text-slate-50 p-3 rounded text-xs font-mono">
                OPENAI_API_KEY=sk-...
              </div>
              <a 
                href="https://platform.openai.com/api-keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline inline-block"
              >
                Get API Key →
              </a>
            </div>

            {/* Anthropic */}
            <div className="border rounded-lg p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-medium">Anthropic</h3>
                <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">Advanced</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Claude 3 models known for high reasoning capabilities and large context windows.
              </p>
              <div className="bg-slate-950 text-slate-50 p-3 rounded text-xs font-mono">
                ANTHROPIC_API_KEY=sk-ant...
              </div>
              <a 
                href="https://console.anthropic.com/settings/keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline inline-block"
              >
                Get API Key →
              </a>
            </div>

            {/* Ollama */}
            <div className="border rounded-lg p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-medium">Ollama (Local)</h3>
                <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">Free / Private</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Run open-source models locally. No API costs, complete privacy, works offline.
              </p>
              <div className="bg-slate-950 text-slate-50 p-3 rounded text-xs font-mono">
                OLLAMA_BASE_URL=http://localhost:11434
              </div>
              <a 
                href="https://ollama.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline inline-block"
              >
                Download Ollama →
              </a>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2">Troubleshooting</h2>
          <div className="space-y-4">
            <div className="border-l-4 border-yellow-500 pl-4 py-1">
              <h4 className="font-medium">API Key Expired</h4>
              <p className="text-sm text-muted-foreground">
                If you see an "API Key Expired" error, generate a new key from your provider's dashboard and update your <code>.env</code> file or settings.
              </p>
            </div>
            <div className="border-l-4 border-red-500 pl-4 py-1">
              <h4 className="font-medium">Rate Limits</h4>
              <p className="text-sm text-muted-foreground">
                If you hit rate limits, the system will automatically try the next provider in the fallback chain. Consider upgrading your plan if this happens frequently.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}