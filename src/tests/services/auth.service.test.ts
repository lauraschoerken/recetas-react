import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

const { postMock } = vi.hoisted(() => ({
	postMock: vi.fn(),
}))

vi.mock('@/services/api', () => ({
	api: {
		post: postMock,
	},
}))

import { authService } from '@/services/auth'

describe('AuthService', () => {
	const getItemMock = () => localStorage.getItem as unknown as Mock

	beforeEach(() => {
		vi.clearAllMocks()
		postMock.mockReset()
		localStorage.getItem = vi.fn()
		localStorage.setItem = vi.fn()
		localStorage.removeItem = vi.fn()
	})

	describe('login', () => {
		it('stores token and user when login succeeds', async () => {
			const data = { email: 'test@test.com', password: 'secret' }
			const response = {
				token: 'jwt-token',
				user: { id: 1, email: 'test@test.com', name: 'Test' },
			}

			postMock.mockResolvedValue(response)

			const result = await authService.login(data)

			expect(postMock).toHaveBeenCalledWith('/auth/login', data)
			expect(localStorage.setItem).toHaveBeenCalledWith('token', response.token)
			expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(response.user))
			expect(result).toEqual(response)
		})
	})

	describe('register', () => {
		it('stores token and user when register succeeds', async () => {
			const data = { email: 'new@test.com', password: 'secret', name: 'New User' }
			const response = {
				token: 'new-jwt-token',
				user: { id: 2, email: 'new@test.com', name: 'New User' },
			}

			postMock.mockResolvedValue(response)

			const result = await authService.register(data)

			expect(postMock).toHaveBeenCalledWith('/auth/register', data)
			expect(localStorage.setItem).toHaveBeenCalledWith('token', response.token)
			expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(response.user))
			expect(result).toEqual(response)
		})
	})

	describe('isAuthenticated', () => {
		it('returns true when token exists in localStorage', () => {
			getItemMock().mockReturnValue('test-token')

			const result = authService.isAuthenticated()

			expect(result).toBe(true)
			expect(localStorage.getItem).toHaveBeenCalledWith('token')
		})

		it('returns false when no token exists', () => {
			getItemMock().mockReturnValue(null)

			const result = authService.isAuthenticated()

			expect(result).toBe(false)
		})
	})

	describe('getUser', () => {
		it('returns user from localStorage', () => {
			const user = { id: 1, email: 'test@test.com', name: 'Test' }
			getItemMock().mockReturnValue(JSON.stringify(user))

			const result = authService.getUser()

			expect(result).toEqual(user)
			expect(localStorage.getItem).toHaveBeenCalledWith('user')
		})

		it('returns null when no user exists', () => {
			getItemMock().mockReturnValue(null)

			const result = authService.getUser()

			expect(result).toBeNull()
		})
	})

	describe('isAuthenticated', () => {
		it('returns true when token exists', () => {
			getItemMock().mockReturnValue('token')

			expect(authService.isAuthenticated()).toBe(true)
		})

		it('returns false when no token exists', () => {
			getItemMock().mockReturnValue(null)

			expect(authService.isAuthenticated()).toBe(false)
		})
	})

	describe('logout', () => {
		it('removes token and user from localStorage', () => {
			authService.logout()

			expect(localStorage.removeItem).toHaveBeenCalledWith('token')
			expect(localStorage.removeItem).toHaveBeenCalledWith('user')
		})
	})
})
