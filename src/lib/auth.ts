import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/server-lib/prisma";
import { nextCookies } from "better-auth/next-js";
import { fromNodeHeaders } from "better-auth/node";
import nodemailer from "nodemailer";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user, url, token }, request) => {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        });

        const companyName = process.env.COMPANY_NAME || "AgentsFlowAI";

        const html = `
          <div>
            <h2>Reset Your Password</h2>
            <p>Hi ${user.name || "User"},</p>
            <p>You requested a password reset for your account.</p>
            <p><a href="${url}">Click here to reset your password</a></p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <p>Best regards,<br>${companyName}</p>
          </div>
        `;

        await transporter.sendMail({
          from: process.env.SMTP_FROM_EMAIL,
          to: user.email,
          subject: "Reset Your Password",
          html,
        });
      } catch (error) {
        console.error("Failed to send reset password email:", error);
      }
    },
  },
  plugins: [nextCookies()],
  user: {
    modelName: "User",
    fields: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
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
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirectURI: process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
        : "http://localhost:3000/api/auth/callback/google",
    },
  },
});
