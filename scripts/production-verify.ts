#!/usr/bin/env tsx
/**
 * Production Verification Script
 * Comprehensive check for AgentsFlowAI application
 */

import { execSync } from "child_process";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";

const COLORS = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

const log = (
  message: string,
  type: "info" | "success" | "error" | "warn" = "info",
) => {
  const color =
    type === "success"
      ? COLORS.green
      : type === "error"
        ? COLORS.red
        : type === "warn"
          ? COLORS.yellow
          : COLORS.blue;
  console.log(`${color}[${type.toUpperCase()}]${COLORS.reset} ${message}`);
};

const logSection = (title: string) => {
  console.log(
    `\n${COLORS.blue}═══════════════════════════════════════${COLORS.reset}`,
  );
  console.log(`${COLORS.blue}  ${title}${COLORS.reset}`);
  console.log(
    `${COLORS.blue}═══════════════════════════════════════${COLORS.reset}\n`,
  );
};

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: CheckResult[] = [];

function addResult(name: string, passed: boolean, message: string) {
  results.push({ name, passed, message });
  log(message, passed ? "success" : "error");
}

// ============================================
// 1. ENVIRONMENT VARIABLES CHECK
// ============================================
function checkEnvironmentVariables() {
  logSection("Environment Variables");

  const requiredVars = [
    "DATABASE_URL",
    "NEXT_PUBLIC_APP_URL",
    "SESSION_SECRET",
    "OPENAI_API_KEY",
  ];

  const optionalVars = [
    "ANTHROPIC_API_KEY",
    "GOOGLE_GENERATIVE_AI_API_KEY",
    "BETTER_AUTH_SECRET",
    "INNGEST_SIGNING_KEY",
    "INNGEST_EVENT_KEY",
  ];

  const envFile = readFileSync(".env.local", "utf-8");

  log("Checking required environment variables...", "info");
  let allRequiredPresent = true;
  for (const varName of requiredVars) {
    const present = envFile.includes(`${varName}=`);
    addResult(
      `ENV_${varName}`,
      present,
      present ? `${varName} is set` : `${varName} is MISSING`,
    );
    if (!present) allRequiredPresent = false;
  }

  log("\nChecking optional environment variables...", "info");
  for (const varName of optionalVars) {
    const present = envFile.includes(`${varName}=`);
    addResult(
      `ENV_${varName}`,
      true,
      present
        ? `${varName} is set (optional)`
        : `${varName} not set (optional)`,
    );
  }

  return allRequiredPresent;
}

// ============================================
// 2. DATABASE CONNECTIVITY CHECK
// ============================================
function checkDatabaseConnectivity() {
  logSection("Database Connectivity");

  try {
    execSync("npx prisma db push --skip-generate 2>&1", {
      encoding: "utf-8",
      timeout: 30000,
    });
    addResult("Database Connection", true, "Database connection successful");
    return true;
  } catch (error: any) {
    addResult(
      "Database Connection",
      false,
      `Database connection failed: ${error.message}`,
    );
    return false;
  }
}

// ============================================
// 3. BUILD CHECK
// ============================================
function checkBuild() {
  logSection("Build Verification");

  try {
    execSync("npm run build 2>&1", { encoding: "utf-8", timeout: 300000 });
    addResult("Build", true, "Build completed successfully");
    return true;
  } catch (error: any) {
    addResult("Build", false, `Build failed: ${error.message}`);
    return false;
  }
}

// ============================================
// 4. TYPE CHECK
// ============================================
function checkTypes() {
  logSection("TypeScript Verification");

  try {
    execSync("npm run typecheck 2>&1", { encoding: "utf-8", timeout: 60000 });
    addResult("TypeScript", true, "TypeScript check passed");
    return true;
  } catch (error: any) {
    addResult("TypeScript", false, `TypeScript check failed: ${error.message}`);
    return false;
  }
}

// ============================================
// 5. LINT CHECK
// ============================================
function checkLint() {
  logSection("Linting");

  try {
    execSync("npm run lint 2>&1", { encoding: "utf-8", timeout: 60000 });
    addResult("Linting", true, "Linting passed");
    return true;
  } catch (error: any) {
    addResult("Linting", false, `Linting failed: ${error.message}`);
    return false;
  }
}

// ============================================
// 6. TEST CHECK
// ============================================
function checkTests() {
  logSection("Tests");

  try {
    execSync("npm run test 2>&1", { encoding: "utf-8", timeout: 120000 });
    addResult("Tests", true, "Tests passed");
    return true;
  } catch (error: any) {
    addResult("Tests", false, `Tests failed: ${error.message}`);
    return false;
  }
}

// ============================================
// 7. ROUTES CHECK
// ============================================
function checkRoutes() {
  logSection("Routes Verification");

  const routes = [
    "/",
    "/welcome",
    "/dashboard",
    "/chat",
    "/leads",
    "/leads/new",
    "/services",
    "/appointments",
    "/analytics",
    "/ai-agents",
    "/ai-agents/seo",
    "/ai-agents/content",
    "/ai-agents/social",
    "/ai-usage",
    "/fast-chat",
  ];

  const appDir = join(process.cwd(), "src/app");

  let allRoutesExist = true;
  for (const route of routes) {
    const routePath = route.replace(/\//g, "(...)").slice(1);
    const routeDir = join(
      appDir,
      route === "/"
        ? "(dashboard)/dashboard"
        : route.slice(1).replace(/\//g, ")/("),
    );

    const exists = existsSync(routeDir) || existsSync(routeDir + "/page.tsx");
    addResult(
      `Route ${route}`,
      exists,
      exists ? `${route} exists` : `${route} MISSING`,
    );
    if (!exists) allRoutesExist = false;
  }

  return allRoutesExist;
}

// ============================================
// 8. API ENDPOINTS CHECK
// ============================================
function checkApiEndpoints() {
  logSection("API Endpoints");

  const endpoints = [
    "/api/health",
    "/api/leads",
    "/api/services",
    "/api/appointments",
    "/api/conversations",
    "/api/dashboard/stats",
    "/api/ai/agents",
    "/api/ai/config",
    "/api/ai/usage",
  ];

  const apiDir = join(process.cwd(), "src/app/api");

  let allEndpointsExist = true;
  for (const endpoint of endpoints) {
    const endpointPath = endpoint.slice(5).replace(/\//g, ")/(");
    const endpointDir = join(apiDir, endpointPath);

    const exists =
      existsSync(endpointDir) || existsSync(endpointDir + "/route.ts");
    addResult(
      `Endpoint ${endpoint}`,
      exists,
      exists ? `${endpoint} exists` : `${endpoint} MISSING`,
    );
    if (!exists) allEndpointsExist = false;
  }

  return allEndpointsExist;
}

// ============================================
// 9. COMPONENTS CHECK
// ============================================
function checkComponents() {
  logSection("Components");

  const requiredComponents = [
    "Button",
    "Input",
    "Card",
    "Sidebar",
    "Topbar",
    "ThemeProvider",
    "ThemeToggle",
  ];

  const uiDir = join(process.cwd(), "src/components/ui");
  const components = readdirSync(uiDir).filter((f) => f.endsWith(".tsx"));

  let allComponentsExist = true;
  for (const component of requiredComponents) {
    const exists = components.some((c) =>
      c.toLowerCase().includes(component.toLowerCase()),
    );
    addResult(
      `Component ${component}`,
      exists,
      exists ? `${component} exists` : `${component} MISSING`,
    );
    if (!exists) allComponentsExist = false;
  }

  return allComponentsExist;
}

// ============================================
// 10. DEPLOYMENT FILES CHECK
// ============================================
function checkDeploymentFiles() {
  logSection("Deployment Configuration");

  const deploymentFiles = [
    "ecosystem.config.mjs",
    "deploy/nginx.conf",
    "deploy/setup-server.sh",
    "deploy/deploy.sh",
    "deploy/rollback.sh",
    "deploy/DEPLOYMENT-CHECKLIST.md",
    "PRODUCTION_CHECKLIST.md",
  ];

  let allFilesExist = true;
  for (const file of deploymentFiles) {
    const exists = existsSync(file);
    addResult(
      `Deploy file ${file}`,
      exists,
      exists ? `${file} exists` : `${file} MISSING`,
    );
    if (!exists) allFilesExist = false;
  }

  return allFilesExist;
}

// ============================================
// 11. DATABASE MIGRATIONS CHECK
// ============================================
function checkMigrations() {
  logSection("Database Migrations");

  const migrationsDir = join(process.cwd(), "prisma/migrations");

  if (!existsSync(migrationsDir)) {
    addResult("Migrations", false, "Migrations directory MISSING");
    return false;
  }

  const migrations = readdirSync(migrationsDir);
  addResult(
    "Migrations",
    migrations.length > 0,
    `Found ${migrations.length} migration(s)`,
  );

  // Check if migrations have been applied
  try {
    execSync("npx prisma migrate status 2>&1", {
      encoding: "utf-8",
      timeout: 30000,
    });
    addResult("Migrations Applied", true, "Migrations are up to date");
    return true;
  } catch (error: any) {
    addResult(
      "Migrations Applied",
      false,
      `Migrations not applied: ${error.message}`,
    );
    return false;
  }
}

// ============================================
// 12. SECURITY CHECKS
// ============================================
function checkSecurity() {
  logSection("Security Configuration");

  const middlewarePath = join(process.cwd(), "middleware.ts");
  if (!existsSync(middlewarePath)) {
    addResult("Middleware", false, "middleware.ts MISSING");
    return false;
  }

  const middleware = readFileSync(middlewarePath, "utf-8");

  const hasRateLimiting = middleware.includes("rateLimiter");
  const hasSecurityHeaders = middleware.includes("X-Content-Type-Options");
  const hasCSP = middleware.includes("Content-Security-Policy");

  addResult(
    "Rate Limiting",
    hasRateLimiting,
    hasRateLimiting
      ? "Rate limiting is configured"
      : "Rate limiting NOT configured",
  );
  addResult(
    "Security Headers",
    hasSecurityHeaders,
    hasSecurityHeaders
      ? "Security headers are set"
      : "Security headers MISSING",
  );
  addResult(
    "CSP Header",
    hasCSP,
    hasCSP ? "CSP header is configured" : "CSP header MISSING",
  );

  return hasRateLimiting && hasSecurityHeaders && hasCSP;
}

// ============================================
// 13. DOCUMENTATION CHECK
// ============================================
function checkDocumentation() {
  logSection("Documentation");

  const docs = ["README.md", "PRODUCTION_CHECKLIST.md"];

  let allDocsExist = true;
  for (const doc of docs) {
    const exists = existsSync(doc);
    addResult(
      `Doc ${doc}`,
      exists,
      exists ? `${doc} exists` : `${doc} MISSING`,
    );
    if (!exists) allDocsExist = false;
  }

  return allDocsExist;
}

// ============================================
// MAIN EXECUTION
// ============================================
async function main() {
  console.log(
    `\n${COLORS.blue}╔═══════════════════════════════════════════╗${COLORS.reset}`,
  );
  console.log(
    `${COLORS.blue}║  Production Verification for AgentsFlowAI  ║${COLORS.reset}`,
  );
  console.log(
    `${COLORS.blue}╚═══════════════════════════════════════════╝${COLORS.reset}\n`,
  );

  const startTime = Date.now();

  // Run all checks
  checkEnvironmentVariables();
  checkDatabaseConnectivity();
  checkMigrations();
  checkTypes();
  checkLint();
  checkTests();
  checkRoutes();
  checkApiEndpoints();
  checkComponents();
  checkSecurity();
  checkDeploymentFiles();
  checkDocumentation();
  checkBuild();

  // Summary
  logSection("Summary");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log(`${COLORS.green}Passed: ${passed}/${total}${COLORS.reset}`);
  console.log(
    `${failed > 0 ? COLORS.red : COLORS.green}Failed: ${failed}/${total}${COLORS.reset}`,
  );

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(
    `\n${COLORS.blue}Verification completed in ${duration}s${COLORS.reset}\n`,
  );

  if (failed > 0) {
    console.log(`${COLORS.red}Issues found:${COLORS.reset}`);
    for (const result of results.filter((r) => !r.passed)) {
      console.log(`  - ${result.name}: ${result.message}`);
    }
  }

  console.log(
    `\n${passed === total ? COLORS.green : COLORS.yellow}Production Readiness: ${passed === total ? "100% - READY" : `${((passed / total) * 100).toFixed(0)}% - NEEDS WORK`}${COLORS.reset}\n`,
  );

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
