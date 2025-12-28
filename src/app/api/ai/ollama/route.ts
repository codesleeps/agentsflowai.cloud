import { NextRequest, NextResponse } from 'next/server';
import { OllamaRequestSchema, validateAndSanitize } from '@/lib/validation-schemas';
import { requireAuth } from '@/lib/auth-helpers';
import { handleApiError } from '@/lib/api-errors';

// Ollama API endpoint - defaults to localhost but can be configured via env
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    await requireAuth(request);

    const body = await request.json();

    // Validate input using Zod schema
    const validatedData = validateAndSanitize(OllamaRequestSchema, body);
    const { action, ...params } = validatedData;

    switch (action) {
      case 'generate':
        return handleGenerate(params);
      case 'chat':
        return handleChat(params);
      case 'models':
        return handleListModels();
      case 'pull':
        return handlePullModel(params);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return handleApiError(error);
  }
}

async function handleGenerate(params: any) {
  const { model, prompt, system, options } = params;

  // Validate required parameters
  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required for generate action' }, { status: 400 });
  }

  // Sanitize prompt to prevent injection
  const sanitizedPrompt = prompt.replace(/[<>]/g, '');

  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model || 'mistral',
      prompt: sanitizedPrompt,
      system,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        ...options,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: 'Ollama generation failed', details: errorText },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}

async function handleChat(params: any) {
  const { model, messages, options } = params;

  // Validate required parameters
  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: 'Messages are required for chat action' }, { status: 400 });
  }

  // Sanitize messages to prevent injection
  const sanitizedMessages = messages.map(msg => ({
    ...msg,
    content: msg.content.replace(/[<>]/g, '')
  }));

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model || 'mistral',
      messages: sanitizedMessages,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        ...options,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: 'Ollama chat failed', details: errorText },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}

async function handleListModels() {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
    method: 'GET',
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: 'Failed to list models' },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}

async function handlePullModel(params: any) {
  const { name } = params;

  // Validate required parameters
  if (!name) {
    return NextResponse.json({ error: 'Model name is required for pull action' }, { status: 400 });
  }

  const response = await fetch(`${OLLAMA_BASE_URL}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, stream: false }),
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: 'Failed to pull model' },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}

// Health check endpoint
export async function GET() {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        status: 'connected',
        ollamaUrl: OLLAMA_BASE_URL,
        models: data.models || [],
      });
    } else {
      return NextResponse.json({
        status: 'disconnected',
        ollamaUrl: OLLAMA_BASE_URL,
        error: 'Cannot reach Ollama server',
      });
    }
  } catch (error) {
    return NextResponse.json({
      status: 'disconnected',
      ollamaUrl: OLLAMA_BASE_URL,
      error: String(error),
    });
  }
}
