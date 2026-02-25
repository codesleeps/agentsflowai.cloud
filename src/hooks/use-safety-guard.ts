/**
 * React Hook for AI Safety Guard
 * Provides client-side safety checks before sending to AI
 */

import { useState, useCallback } from "react";
import { checkSafety, SafetyCheckOptions, SafetyCheckResult } from "@/lib/ai/safety/guard";

interface UseSafetyGuardOptions extends SafetyCheckOptions {
  onViolation?: (result: SafetyCheckResult) => void;
  onSafe?: (text: string) => void;
}

interface UseSafetyGuardReturn {
  checkText: (text: string) => Promise<SafetyCheckResult>;
  lastResult: SafetyCheckResult | null;
  isChecking: boolean;
  violationCount: number;
}

export function useSafetyGuard(options: UseSafetyGuardOptions = {}): UseSafetyGuardReturn {
  const [lastResult, setLastResult] = useState<SafetyCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [violationCount, setViolationCount] = useState(0);

  const checkText = useCallback(
    async (text: string): Promise<SafetyCheckResult> => {
      setIsChecking(true);

      try {
        const result = await checkSafety(text, options);
        setLastResult(result);

        if (!result.safe) {
          setViolationCount((prev) => prev + 1);
          options.onViolation?.(result);
        } else {
          options.onSafe?.(text);
        }

        return result;
      } finally {
        setIsChecking(false);
      }
    },
    [options]
  );

  return {
    checkText,
    lastResult,
    isChecking,
    violationCount,
  };
}

/**
 * Hook for real-time safety checking with debounce
 */
interface UseRealtimeSafetyOptions extends SafetyCheckOptions {
  debounceMs?: number;
  onResult?: (result: SafetyCheckResult) => void;
}

interface UseRealtimeSafetyReturn {
  checkText: (text: string) => void;
  result: SafetyCheckResult | null;
  isChecking: boolean;
}

export function useRealtimeSafety(options: UseRealtimeSafetyOptions = {}): UseRealtimeSafetyReturn {
  const { debounceMs = 500, onResult, ...safetyOptions } = options;
  const [result, setResult] = useState<SafetyCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const timeoutRef = useState<ReturnType<typeof setTimeout> | null>(null);

  const checkText = useCallback(
    (text: string) => {
      // Clear existing timeout
      if (timeoutRef[0]) {
        clearTimeout(timeoutRef[0]);
      }

      // Don't check empty text
      if (!text.trim()) {
        setResult(null);
        return;
      }

      // Debounce the check
      const timeout = setTimeout(async () => {
        setIsChecking(true);
        try {
          const checkResult = await checkSafety(text, safetyOptions);
          setResult(checkResult);
          onResult?.(checkResult);
        } finally {
          setIsChecking(false);
        }
      }, debounceMs);

      timeoutRef[0] = timeout;
    },
    [debounceMs, onResult, safetyOptions]
  );

  return {
    checkText,
    result,
    isChecking,
  };
}
