import { z } from "zod";

const serverEnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().refine((url) => url.startsWith("postgresql://"), {
    message: "DATABASE_URL must be a PostgreSQL connection string",
  }),

  // AI Services
  OLLAMA_BASE_URL: z
    .preprocess((val) => (val === "" ? undefined : val), z.string().url("OLLAMA_BASE_URL must be a valid URL").optional().default("http://localhost:11434")),
  GOOGLE_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),

  // Application
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters"),

  // Better Auth
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z
    .preprocess((val) => (val === "" ? undefined : val), z.string().url("BETTER_AUTH_URL must be a valid URL").optional()),

  // Inngest
  INNGEST_SIGNING_KEY: z.string().optional(),
  INNGEST_EVENT_KEY: z.string().optional(),
});

const clientEnvSchema = z.object({
  // Application (Shared)
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: z
    .preprocess((val) => (val === "" ? undefined : val), z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL").optional()),

  // Development Only
  NEXT_PUBLIC_DEV_USER_NAME: z.string().optional(),
  NEXT_PUBLIC_DEV_USER_EMAIL: z
    .preprocess((val) => (val === "" ? undefined : val), z.string().email().optional()),
  NEXT_PUBLIC_DEV_USER_IMAGE: z
    .preprocess((val) => (val === "" ? undefined : val), z.string().url().optional()),
});

// Combined schema for type inference
const envSchema = serverEnvSchema.merge(clientEnvSchema);

export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

export function validateEnv(): Env {
  if (validatedEnv) {
    return validatedEnv;
  }

  try {
    const isServer = typeof window === "undefined";

    // On the server, validate everything
    if (isServer) {
      const parsedServer = serverEnvSchema.parse(process.env);
      const parsedClient = clientEnvSchema.parse(process.env);
      validatedEnv = { ...parsedServer, ...parsedClient };

      // Additional validation for production
      if (validatedEnv.NODE_ENV === "production") {
        if (!validatedEnv.NEXT_PUBLIC_APP_URL) {
          throw new Error("NEXT_PUBLIC_APP_URL is required in production");
        }
        if (!validatedEnv.INNGEST_SIGNING_KEY) {
          throw new Error("INNGEST_SIGNING_KEY is required in production");
        }
        if (!validatedEnv.INNGEST_EVENT_KEY) {
          throw new Error("INNGEST_EVENT_KEY is required in production");
        }
      }

      // Safety check: prevent dev variables in production
      if (validatedEnv.NODE_ENV === "production") {
        // Check for any NEXT_PUBLIC_DEV_USER_* variables
        const devUserVars = Object.keys(process.env).filter((key) =>
          key.startsWith("NEXT_PUBLIC_DEV_USER_"),
        );

        if (devUserVars.length > 0) {
          throw new Error(
            `Development user variables should not be set in production: ${devUserVars.join(", ")}`,
          );
        }
      }
    } else {
      // On the client, only validate client variables
      // We cast the result to full Env type but server props will be missing (undefined)
      // This is acceptable as client code shouldn't access them
      validatedEnv = clientEnvSchema.parse(process.env) as unknown as Env;
    }

    return validatedEnv;
  } catch (error) {
    console.error("Environment validation failed:", error);
    if (error instanceof z.ZodError) {
      console.error("Validation errors:", error.errors);
    }
    // Only exit process on server during runtime, not during build
    if (typeof window === "undefined") {
      // Check if we're in build mode (Next.js sets NEXT_PHASE=phase-production-build)
      const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' ||
        process.env.npm_lifecycle_event === 'build' ||
        !process.env.NODE_ENV;

      if (!isBuildTime) {
        process.exit(1);
      } else {
        // During build time, log warning but don't fail
        console.warn("⚠️ Environment validation failed during build. This is expected - variables will be validated at runtime.");
        // Return a minimal valid env for build time
        return {
          NODE_ENV: "production",
          NEXT_PUBLIC_APP_URL: "https://agentsflowai.cloud",
        } as Env;
      }
    } else {
      throw error;
    }
  }
}

export function getEnv(): Env {
  if (!validatedEnv) {
    return validateEnv();
  }
  return validatedEnv;
}
