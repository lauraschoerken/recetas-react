import type { AuthResponse, LoginData, RegisterData, User } from '@/models'

export const mockUser = (overrides: Partial<User> = {}): User => ({
	id: 1,
	email: 'laura@example.com',
	name: 'Laura',
	...overrides,
})

export const mockLoginData = (overrides: Partial<LoginData> = {}): LoginData => ({
	email: 'laura@example.com',
	password: 'Password123!',
	...overrides,
})

export const mockRegisterData = (overrides: Partial<RegisterData> = {}): RegisterData => ({
	email: 'laura@example.com',
	password: 'Password123!',
	name: 'Laura',
	...overrides,
})

export const mockAuthResponse = (overrides: Partial<AuthResponse> = {}): AuthResponse => ({
	user: mockUser(),
	token: 'mock-jwt-token',
	...overrides,
})
