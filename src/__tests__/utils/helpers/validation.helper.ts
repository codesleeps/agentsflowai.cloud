import { z } from "zod";
import {
  LeadCreateSchema,
  LeadUpdateSchema,
  AppointmentCreateSchema,
  ConversationCreateSchema,
  MessageCreateSchema,
  ServiceCreateSchema,
  RegistrationSchema,
  LoginSchema,
  validateAndSanitize,
} from "@/lib/validation-schemas";

export const validateSchema = <T>(
  schema: z.ZodSchema<T>,
  data: any,
): { success: boolean; data?: T; error?: any } => {
  try {
    const result = validateAndSanitize(schema, data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error };
  }
};

export const expectSchemaToPass = <T>(schema: z.ZodSchema<T>, data: any) => {
  const result = validateSchema(schema, data);
  expect(result.success).toBe(true);
  expect(result.data).toBeDefined();
  return result.data!;
};

export const expectSchemaToFail = <T>(schema: z.ZodSchema<T>, data: any) => {
  const result = validateSchema(schema, data);
  expect(result.success).toBe(false);
  expect(result.error).toBeDefined();
  return result.error;
};

export const getValidationErrors = (error: any): string[] => {
  if (error instanceof z.ZodError) {
    return error.errors.map((err) => err.message);
  }
  return [error.message || "Unknown validation error"];
};

// Specific validation helpers for common schemas
export const validateLeadCreation = (data: any) =>
  validateSchema(LeadCreateSchema, data);
export const validateLeadUpdate = (data: any) =>
  validateSchema(LeadUpdateSchema, data);
export const validateAppointmentCreation = (data: any) =>
  validateSchema(AppointmentCreateSchema, data);
export const validateConversationCreation = (data: any) =>
  validateSchema(ConversationCreateSchema, data);
export const validateMessageCreation = (data: any) =>
  validateSchema(MessageCreateSchema, data);
export const validateServiceCreation = (data: any) =>
  validateSchema(ServiceCreateSchema, data);
export const validateRegistration = (data: any) =>
  validateSchema(RegistrationSchema, data);
export const validateLogin = (data: any) => validateSchema(LoginSchema, data);

// Test data generators for validation testing
export const createValidLeadData = (overrides: Partial<any> = {}) => ({
  name: "John Doe",
  email: "john.doe@example.com",
  source: "website",
  ...overrides,
});

export const createValidAppointmentData = (overrides: Partial<any> = {}) => ({
  lead_id: "550e8400-e29b-41d4-a716-446655440000",
  title: "Consultation Meeting",
  scheduled_at: new Date().toISOString(),
  duration_minutes: 60,
  ...overrides,
});

export const createValidMessageData = (overrides: Partial<any> = {}) => ({
  role: "user",
  content: "Hello, I need help with my project",
  ...overrides,
});

export const createValidRegistrationData = (overrides: Partial<any> = {}) => ({
  name: "Test User",
  email: "test@example.com",
  password: "TestPass123!",
  confirmPassword: "TestPass123!",
  ...overrides,
});

export const createValidLoginData = (overrides: Partial<any> = {}) => ({
  email: "test@example.com",
  password: "TestPass123!",
  ...overrides,
});
