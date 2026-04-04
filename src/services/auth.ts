import { api } from '@/services/api'

export interface User {
	id: number
	email: string
	name: string
}

export interface AuthResponse {
	user: User
	token: string
}

export interface LoginData {
	email: string
	password: string
}

export interface RegisterData {
	email: string
	password: string
	name: string
}

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
