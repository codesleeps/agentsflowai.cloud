/**
 * PII (Personally Identifiable Information) Detection Service
 * Detects and redacts sensitive personal information from text
 */

export type PIICategory =
  | "email"
  | "phone"
  | "ssn"
  | "credit_card"
  | "ip_address"
  | "address"
  | "name"
  | "date_of_birth"
  | "bank_account"
  | "passport"
  | "drivers_license"
  | "medical_record"
  | "api_key"
  | "password";

export interface PIIDetection {
  category: PIICategory;
  type: string;
  value: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
}

export interface PIIDetectionResult {
  hasPII: boolean;
  detections: PIIDetection[];
  redactedText: string;
  riskLevel: "none" | "low" | "medium" | "high" | "critical";
}

// PII Detection Patterns
const PII_PATTERNS: Record<PIICategory, { patterns: RegExp[]; weight: number }> = {
  email: {
    patterns: [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    ],
    weight: 3,
  },
  phone: {
    patterns: [
      /\b\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, // US phone
      /\b\+?\d{1,3}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}\b/g, // International
    ],
    weight: 3,
  },
  ssn: {
    patterns: [
      /\b\d{3}[\s-]?\d{2}[\s-]?\d{4}\b/g,
      /\b\d{9}\b/g,
    ],
    weight: 5,
  },
  credit_card: {
    patterns: [
      /\b(?:\d{4}[\s-]?){3}\d{4}\b/g, // Generic pattern
      /\b4\d{3}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Visa
      /\b5[1-5]\d{2}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Mastercard
      /\b3[47]\d{2}[\s-]?\d{6}[\s-]?\d{5}\b/g, // Amex
    ],
    weight: 5,
  },
  ip_address: {
    patterns: [
      /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g, // IPv4
      /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g, // IPv6
    ],
    weight: 2,
  },
  address: {
    patterns: [
      /\b\d+\s+[A-Za-z]+\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Circle|Cir|Trail|Trl|Parkway|Pkwy|Highway|Hwy)\b/gi,
      /\b(?:Apt|Apartment|Suite|Unit|#)\s*\d+\b/gi,
      /\b[A-Za-z]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?\b/g, // City, State ZIP
    ],
    weight: 3,
  },
  name: {
    patterns: [
      /\b(?:Mr|Mrs|Ms|Dr|Prof)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g,
    ],
    weight: 2,
  },
  date_of_birth: {
    patterns: [
      /\b(?:0[1-9]|1[0-2])[\/\-.](?:0[1-9]|[12]\d|3[01])[\/\-.](?:19|20)\d{2}\b/g, // MM/DD/YYYY
      /\b(?:0[1-9]|[12]\d|3[01])[\/\-.](?:0[1-9]|1[0-2])[\/\-.](?:19|20)\d{2}\b/g, // DD/MM/YYYY
    ],
    weight: 4,
  },
  bank_account: {
    patterns: [
      /\b\d{8,17}\b/g, // Generic account number
      /\b\d{9}\b/g, // Routing number
    ],
    weight: 5,
  },
  passport: {
    patterns: [
      /\b[A-Z]\d{8}\b/g, // US Passport
      /\b\d{9}\b/g,
    ],
    weight: 5,
  },
  drivers_license: {
    patterns: [
      /\b[A-Z]{1,2}\d{6,8}\b/g,
      /\b\d{7,9}\b/g,
    ],
    weight: 4,
  },
  medical_record: {
    patterns: [
      /\bMRN[\s:]?\d{6,10}\b/gi,
      /\bMedical\s+Record[\s:]?\d+\b/gi,
    ],
    weight: 5,
  },
  api_key: {
    patterns: [
      /\b(?:sk-|pk-|ak-|bk-)[A-Za-z0-9]{32,}\b/g,
      /\b[A-Za-z0-9]{32,64}\b/g,
    ],
    weight: 4,
  },
  password: {
    patterns: [
      /\bpassword[\s:=]+\S+/gi,
      /\bpwd[\s:=]+\S+/gi,
      /\bpass[\s:=]+\S+/gi,
    ],
    weight: 5,
  },
};

/**
 * Detect PII in text
 */
export function detectPII(text: string): PIIDetectionResult {
  const detections: PIIDetection[] = [];
  let totalRiskScore = 0;

  for (const [category, config] of Object.entries(PII_PATTERNS)) {
    for (const pattern of config.patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match.index !== undefined) {
          detections.push({
            category: category as PIICategory,
            type: getPIITypeLabel(category as PIICategory),
            value: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            confidence: calculateConfidence(match[0], category as PIICategory),
          });
          totalRiskScore += config.weight;
        }
      }
    }
  }

  // Sort by start index
  detections.sort((a, b) => a.startIndex - b.startIndex);

  // Remove overlapping detections (keep the one with higher confidence)
  const filteredDetections = removeOverlappingDetections(detections);

  // Calculate risk level
  const riskLevel = calculateRiskLevel(filteredDetections.length, totalRiskScore);

  // Generate redacted text
  const redactedText = redactPII(text, filteredDetections);

  return {
    hasPII: filteredDetections.length > 0,
    detections: filteredDetections,
    redactedText,
    riskLevel,
  };
}

/**
 * Remove overlapping detections, keeping the one with higher confidence
 */
function removeOverlappingDetections(detections: PIIDetection[]): PIIDetection[] {
  const result: PIIDetection[] = [];

  for (const detection of detections) {
    let overlaps = false;
    for (const existing of result) {
      if (
        (detection.startIndex >= existing.startIndex &&
          detection.startIndex < existing.endIndex) ||
        (detection.endIndex > existing.startIndex &&
          detection.endIndex <= existing.endIndex)
      ) {
        overlaps = true;
        // Replace if higher confidence
        if (detection.confidence > existing.confidence) {
          const index = result.indexOf(existing);
          result[index] = detection;
        }
        break;
      }
    }
    if (!overlaps) {
      result.push(detection);
    }
  }

  return result;
}

/**
 * Calculate confidence score for a detection
 */
function calculateConfidence(value: string, category: PIICategory): number {
  let confidence = 0.7; // Base confidence

  // Adjust based on value characteristics
  switch (category) {
    case "email":
      confidence = value.includes("@") && value.includes(".") ? 0.95 : 0.5;
      break;
    case "phone":
      confidence = value.replace(/\D/g, "").length >= 10 ? 0.9 : 0.6;
      break;
    case "ssn":
      confidence = value.replace(/\D/g, "").length === 9 ? 0.95 : 0.7;
      break;
    case "credit_card":
      const digits = value.replace(/\D/g, "");
      confidence = digits.length >= 13 && digits.length <= 19 ? 0.9 : 0.6;
      break;
    case "api_key":
      confidence = value.length >= 32 ? 0.85 : 0.7;
      break;
  }

  return confidence;
}

/**
 * Calculate overall risk level
 */
function calculateRiskLevel(
  detectionCount: number,
  totalRiskScore: number
): "none" | "low" | "medium" | "high" | "critical" {
  if (detectionCount === 0) return "none";
  if (totalRiskScore >= 15 || detectionCount >= 5) return "critical";
  if (totalRiskScore >= 10 || detectionCount >= 3) return "high";
  if (totalRiskScore >= 5 || detectionCount >= 2) return "medium";
  return "low";
}

/**
 * Get human-readable label for PII category
 */
function getPIITypeLabel(category: PIICategory): string {
  const labels: Record<PIICategory, string> = {
    email: "Email Address",
    phone: "Phone Number",
    ssn: "Social Security Number",
    credit_card: "Credit Card Number",
    ip_address: "IP Address",
    address: "Physical Address",
    name: "Person Name",
    date_of_birth: "Date of Birth",
    bank_account: "Bank Account Number",
    passport: "Passport Number",
    drivers_license: "Driver's License",
    medical_record: "Medical Record Number",
    api_key: "API Key",
    password: "Password",
  };
  return labels[category];
}

/**
 * Redact PII from text
 */
export function redactPII(
  text: string,
  detections: PIIDetection[],
  replacement: string = "[REDACTED]"
): string {
  let redacted = text;
  let offset = 0;

  for (const detection of detections) {
    const start = detection.startIndex + offset;
    const end = detection.endIndex + offset;
    const length = end - start;

    redacted = redacted.substring(0, start) + replacement + redacted.substring(end);
    offset += replacement.length - length;
  }

  return redacted;
}

/**
 * Partially mask PII (show first/last few characters)
 */
export function maskPII(
  text: string,
  detections: PIIDetection[],
  visibleChars: number = 4
): string {
  let masked = text;
  let offset = 0;

  for (const detection of detections) {
    const value = detection.value;
    const start = detection.startIndex + offset;
    const end = detection.endIndex + offset;

    let maskedValue: string;
    if (value.length <= visibleChars * 2) {
      maskedValue = "*".repeat(value.length);
    } else {
      maskedValue =
        value.substring(0, visibleChars) +
        "*".repeat(value.length - visibleChars * 2) +
        value.substring(value.length - visibleChars);
    }

    masked = masked.substring(0, start) + maskedValue + masked.substring(end);
    offset += maskedValue.length - value.length;
  }

  return masked;
}

/**
 * Check if text contains high-risk PII
 */
export function containsHighRiskPII(text: string): boolean {
  const result = detectPII(text);
  return result.riskLevel === "high" || result.riskLevel === "critical";
}

/**
 * Sanitize text by removing all PII
 */
export function sanitizePII(
  text: string,
  options: {
    replacement?: string;
    allowLowRisk?: boolean;
  } = {}
): string {
  const { replacement = "[REDACTED]", allowLowRisk = false } = options;

  const result = detectPII(text);

  if (allowLowRisk && result.riskLevel === "low") {
    return text;
  }

  return redactPII(text, result.detections, replacement);
}

/**
 * Validate that text doesn't contain PII (for API inputs)
 */
export function validateNoPII(
  text: string,
  allowedCategories: PIICategory[] = []
): { valid: boolean; violations: PIIDetection[] } {
  const result = detectPII(text);

  const violations = result.detections.filter(
    (d) => !allowedCategories.includes(d.category)
  );

  return {
    valid: violations.length === 0,
    violations,
  };
}
