import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '@/services/auth';

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.getItem = vi.fn();
    localStorage.setItem = vi.fn();
    localStorage.removeItem = vi.fn();
  });

  describe('isAuthenticated', () => {
    it('returns true when token exists in localStorage', () => {
      (localStorage.getItem as any).mockReturnValue('test-token');

      const result = authService.isAuthenticated();

      expect(result).toBe(true);
      expect(localStorage.getItem).toHaveBeenCalledWith('token');
    });

    it('returns false when no token exists', () => {
      (localStorage.getItem as any).mockReturnValue(null);

      const result = authService.isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe('getUser', () => {
    it('returns user from localStorage', () => {
      const user = { id: 1, email: 'test@test.com', name: 'Test' };
      (localStorage.getItem as any).mockReturnValue(JSON.stringify(user));
      
      const result = authService.getUser();
      
      expect(result).toEqual(user);
      expect(localStorage.getItem).toHaveBeenCalledWith('user');
    });

    it('returns null when no user exists', () => {
      (localStorage.getItem as any).mockReturnValue(null);
      
      const result = authService.getUser();
      
      expect(result).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('returns true when token exists', () => {
      (localStorage.getItem as any).mockReturnValue('token');
      
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('returns false when no token exists', () => {
      (localStorage.getItem as any).mockReturnValue(null);
      
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('logout', () => {
    it('removes token and user from localStorage', () => {
      authService.logout();
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
    });
  });
});
