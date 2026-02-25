"use client";

import { AlertTriangle, Shield, Eye, EyeOff, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SafetyCheckResult } from "@/lib/ai/safety/guard";

interface SafetyWarningProps {
  result: SafetyCheckResult;
  onDismiss?: () => void;
  onShowDetails?: () => void;
  showDetails?: boolean;
}

export function SafetyWarning({
  result,
  onDismiss,
  onShowDetails,
  showDetails = false,
}: SafetyWarningProps) {
  const getSeverityColor = () => {
    if (result.moderationResult?.severity === "high") return "destructive";
    if (result.moderationResult?.severity === "medium") return "warning";
    if (result.piiResult?.riskLevel === "high" || result.piiResult?.riskLevel === "critical")
      return "destructive";
    return "default";
  };

  const getSeverityIcon = () => {
    if (result.blocked) return <AlertTriangle className="h-4 w-4" />;
    return <Shield className="h-4 w-4" />;
  };

  return (
    <Alert variant={getSeverityColor() as "default" | "destructive"} className="mb-4">
      <div className="flex items-start gap-2">
        {getSeverityIcon()}
        <div className="flex-1">
          <AlertTitle>
            {result.blocked ? "Content Blocked" : "Safety Warning"}
          </AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-2">{result.reason}</p>

            {/* Violations List */}
            {result.violations.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {result.violations.map((violation, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {violation}
                  </Badge>
                ))}
              </div>
            )}

            {/* Details */}
            {showDetails && (
              <div className="mt-4 space-y-3 text-sm">
                {/* Moderation Details */}
                {result.moderationResult?.flagged && (
                  <div>
                    <p className="font-medium mb-1">Moderation Issues:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {result.moderationResult.flagged_categories.map((cat) => (
                        <li key={cat}>
                          {cat.replace(/_/g, " ")} (
                          {(
                            (result.moderationResult?.category_scores as Record<string, number>)?.[
                              cat
                            ] * 100
                          ).toFixed(1)}
                          %)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* PII Details */}
                {result.piiResult?.hasPII && (
                  <div>
                    <p className="font-medium mb-1">PII Detected:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {result.piiResult.detections.map((detection, index) => (
                        <li key={index}>
                          {detection.type} (confidence: {(detection.confidence * 100).toFixed(0)}%)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sanitized Preview */}
                {result.sanitizedText && (
                  <div>
                    <p className="font-medium mb-1">Sanitized Version:</p>
                    <p className="text-muted-foreground bg-muted p-2 rounded">
                      {result.sanitizedText}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-4">
              {onShowDetails && (
                <Button variant="outline" size="sm" onClick={onShowDetails}>
                  {showDetails ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Hide Details
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Show Details
                    </>
                  )}
                </Button>
              )}
              {onDismiss && (
                <Button variant="ghost" size="sm" onClick={onDismiss}>
                  Dismiss
                </Button>
              )}
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}

interface SafetyStatusProps {
  isChecking: boolean;
  result: SafetyCheckResult | null;
  showText?: boolean;
}

export function SafetyStatus({ isChecking, result, showText = true }: SafetyStatusProps) {
  if (isChecking) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        {showText && <span className="text-sm">Checking safety...</span>}
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Info className="h-4 w-4" />
        {showText && <span className="text-sm">Safety check pending</span>}
      </div>
    );
  }

  if (result.safe) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <Shield className="h-4 w-4" />
        {showText && <span className="text-sm">Content is safe</span>}
      </div>
    );
  }

  if (result.blocked) {
    return (
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-4 w-4" />
        {showText && <span className="text-sm">Content blocked</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-yellow-600">
      <AlertTriangle className="h-4 w-4" />
      {showText && <span className="text-sm">Issues detected</span>}
    </div>
  );
}
