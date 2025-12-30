import type { Conversation, Message } from "@/shared/models/types";

let conversationCounter = 1;
let messageCounter = 1;

export const createMockConversation = (
  overrides: Partial<Conversation> = {},
): Conversation => ({
  id: `conversation-${conversationCounter++}`,
  lead_id: "lead-123",
  status: "active",
  channel: "chat",
  started_at: new Date().toISOString(),
  ended_at: null,
  summary: null,
  sentiment: "neutral",
  created_at: new Date().toISOString(),
  whatsapp_id: null,
  sms_id: null,
  messenger_id: null,
  instagram_id: null,
  channel_metadata: {},
  ...overrides,
});

export const createMockMessage = (
  conversationId: string,
  overrides: Partial<Message> = {},
): Message => ({
  id: `message-${messageCounter++}`,
  conversation_id: conversationId,
  role: "user",
  content: "Hello, I'm interested in your services",
  metadata: {},
  created_at: new Date().toISOString(),
  ...overrides,
});

export const createMockConversations = (
  count: number,
  overrides: Partial<Conversation>[] | Partial<Conversation> = {},
): Conversation[] => {
  return Array.from({ length: count }, (_, index) => {
    const conversationOverrides = Array.isArray(overrides)
      ? overrides[index] || {}
      : overrides;
    return createMockConversation({
      id: `conversation-${index + 1}`,
      ...conversationOverrides,
    });
  });
};

export const createMockConversationWithMessages = (
  messageCount: number = 3,
  overrides: Partial<Conversation> = {},
): { conversation: Conversation; messages: Message[] } => {
  const conversation = createMockConversation(overrides);
  const messages = Array.from({ length: messageCount }, (_, index) =>
    createMockMessage(conversation.id, {
      role: index % 2 === 0 ? "user" : "assistant",
      content:
        index % 2 === 0
          ? `User message ${index + 1}`
          : `Assistant response ${index + 1}`,
    }),
  );

  return { conversation, messages };
};

export const createMockClosedConversation = (
  overrides: Partial<Conversation> = {},
): Conversation => {
  return createMockConversation({
    status: "closed",
    ended_at: new Date().toISOString(),
    summary: "Conversation completed successfully",
    sentiment: "positive",
    ...overrides,
  });
};
