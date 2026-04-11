import type { AuthResponse, LoginData, RegisterData, User } from '@/models'
import { api } from '@/services/api'

export type { AuthResponse, LoginData, RegisterData, User } from '@/models'

export const authService = {
	async login(data: LoginData): Promise<AuthResponse> {
		const response = await api.post<AuthResponse>('/auth/login', data)
		localStorage.setItem('token', response.token)
		localStorage.setItem('user', JSON.stringify(response.user))
		console.log('Login successful:', response.user)
		return response
	},

	async register(data: RegisterData): Promise<AuthResponse> {
		const response = await api.post<AuthResponse>('/auth/register', data)
		localStorage.setItem('token', response.token)
		localStorage.setItem('user', JSON.stringify(response.user))
		return response
	},

	logout(): void {
		localStorage.removeItem('token')
		localStorage.removeItem('user')
	},

	getUser(): User | null {
		const user = localStorage.getItem('user')
		return user ? JSON.parse(user) : null
	},

	isAuthenticated(): boolean {
		return !!localStorage.getItem('token')
	},

	async updateAccount(data: { name?: string; email?: string; imageUrl?: string }): Promise<User> {
		const user = await api.put<User>('/auth/account', data)
		localStorage.setItem('user', JSON.stringify(user))
		return user
	},

	async changePassword(
		currentPassword: string,
		newPassword: string
	): Promise<{ success: boolean }> {
		return api.post('/auth/change-password', { currentPassword, newPassword })
	},

	async getMe(): Promise<User> {
		return api.get<User>('/auth/me')
	},
}
