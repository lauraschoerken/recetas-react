import type { AuthResponse, LoginData, RegisterData, User } from '@/models'
import { api } from '@/services/api'

export type { AuthResponse, LoginData, RegisterData, User } from '@/models'

export const authService = {
	async login(data: LoginData): Promise<AuthResponse> {
		const response = await api.post<AuthResponse>('/auth/login', data)
		localStorage.setItem('token', response.token)
		localStorage.setItem('user', JSON.stringify(response.user))
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
}
