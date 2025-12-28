"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";
import * as React from "react";
import { useState } from "react";

export function Providers({ children, ...props }: ThemeProviderProps) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <QueryClientProvider client={queryClient}>
            <NextThemesProvider {...props}>{children}</NextThemesProvider>
        </QueryClientProvider>
    );
}
