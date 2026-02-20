export const rateLimiter = {
  check: jest.fn().mockReturnValue({
    allowed: true,
    remaining: 59,
    resetTime: Date.now() + 60000,
  }),
  shouldSkip: jest.fn().mockReturnValue(false),
};