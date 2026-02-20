export const handleCors = jest.fn().mockReturnValue(null);
export const isOriginAllowed = jest.fn().mockReturnValue(true);
export const getCorsConfig = jest.fn().mockReturnValue({
  allowedOrigins: ['https://agentsflowai.cloud'],
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-Inngest-Signature'],
  exposedHeaders: ['X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: true,
  maxAge: 86400,
});