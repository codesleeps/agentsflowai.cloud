import "globals.css";

import { type Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/Providers";
import { Toaster } from "@/components/ui/sonner";
import { validateEnv } from "@/lib/env-validation";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const appName = process.env.NEXT_PUBLIC_APP_NAME || "AgentsFlowAI";

export const metadata: Metadata = {
  title: appName,
  description: `${appName} - AI-Powered Business Automation Platform`,
  icons: {
    icon: "/favicons/flowing_f_32x32.png",
    shortcut: "/favicons/flowing_f_16x16.png",
    apple: "/favicons/flowing_f_apple_touch.png",
  },
  manifest: "/favicons/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Validate environment variables on startup
  validateEnv();

  return (
    <html lang="en" suppressHydrationWarning className={`${inter.className}`}>
      <body className="min-h-screen">
        <Providers
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors />
        </Providers>
      </body>
    </html>
  );
}
