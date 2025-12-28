import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/server-lib/prisma";
import { nextCookies } from "better-auth/next-js";
import { fromNodeHeaders } from "better-auth/node";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  plugins: [nextCookies()],
  user: {
    modelName: "User",
  },
  session: {
    modelName: "Session",
  },
  account: {
    modelName: "Account",
  },
  verification: {
    modelName: "Verification",
  },
  // Google OAuth configuration
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectURI: process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
      : "http://localhost:3000/api/auth/callback/google",
  },
});
