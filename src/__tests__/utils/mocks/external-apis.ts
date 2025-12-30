// Anthropic Claude API mocks
export const mockAnthropicAPI = (
  response: any = { content: "Mock response" },
) => {
  const mockFn = jest.fn().mockResolvedValue(response);
  jest.doMock("@anthropic-ai/sdk", () => ({
    Anthropic: jest.fn().mockImplementation(() => ({
      messages: {
        create: mockFn,
      },
    })),
  }));
  return mockFn;
};

// Google Gemini API mocks
export const mockGoogleAI = (response: any = { text: "Mock response" }) => {
  const mockFn = jest.fn().mockResolvedValue(response);
  jest.doMock("@google/generative-ai", () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: mockFn,
      }),
    })),
  }));
  return mockFn;
};

// OpenAI API mocks
export const mockOpenAI = (
  response: any = { choices: [{ message: { content: "Mock response" } }] },
) => {
  const mockFn = jest.fn().mockResolvedValue(response);
  jest.doMock("openai", () => ({
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockFn,
        },
      },
    })),
  }));
  return mockFn;
};

// Ollama API mocks
export const mockOllamaAPI = (
  response: any = { response: "Mock response" },
) => {
  const mockFn = jest.fn().mockResolvedValue(response);
  jest.doMock("ollama", () => ({
    Ollama: jest.fn().mockImplementation(() => ({
      generate: mockFn,
    })),
  }));
  return mockFn;
};

// Crustdata API mocks
export const mockCrustdataAPI = (response: any = { data: [] }) => {
  const mockFn = jest.fn().mockResolvedValue(response);
  jest.doMock("@/lib/crustdata", () => ({
    enrichContact: mockFn,
    searchContacts: mockFn,
  }));
  return mockFn;
};

// Forager API mocks
export const mockForagerAPI = (response: any = { emails: [] }) => {
  const mockFn = jest.fn().mockResolvedValue(response);
  jest.doMock("@/lib/forager", () => ({
    findEmails: mockFn,
  }));
  return mockFn;
};

// Twilio service mocks
export const mockTwilioService = (response: any = { sid: "mock-sid" }) => {
  const mockFn = jest.fn().mockResolvedValue(response);
  jest.doMock("twilio", () => ({
    Twilio: jest.fn().mockImplementation(() => ({
      calls: {
        create: mockFn,
      },
      messages: {
        create: mockFn,
      },
    })),
  }));
  return mockFn;
};

// Nodemailer mocks
export const mockNodemailer = (response: any = { messageId: "mock-id" }) => {
  const mockFn = jest.fn().mockResolvedValue(response);
  jest.doMock("nodemailer", () => ({
    createTransporter: jest.fn().mockReturnValue({
      sendMail: mockFn,
    }),
  }));
  return mockFn;
};

// Response builders
export const createAIResponse = (content: string, model = "gpt-4") => ({
  choices: [
    {
      message: {
        content,
        role: "assistant",
      },
      finish_reason: "stop",
    },
  ],
  usage: {
    prompt_tokens: 10,
    completion_tokens: 20,
    total_tokens: 30,
  },
  model,
});

export const createEnrichmentResponse = (data: any[]) => ({
  success: true,
  data,
  total: data.length,
});

export const createEmailResponse = (emails: string[]) => ({
  emails,
  count: emails.length,
});

// Reset all external API mocks
export const resetExternalAPIMocks = () => {
  jest.clearAllMocks();
  jest.resetModules();
};
