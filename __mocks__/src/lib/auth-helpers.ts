export const isInngestRequest = jest.fn().mockReturnValue(false);
export const getServerSessionFromRequest = jest.fn().mockResolvedValue({
  authenticated: false,
  error: 'No session found',
});
export const requireAuth = jest.fn().mockRejectedValue(new Error('Authentication required'));
export const getUserFromRequest = jest.fn().mockResolvedValue(null);
export const requireRole = jest.fn().mockRejectedValue(new Error('Insufficient permissions'));