import { mockAuthResponse, mockUser } from '@/mocks/domains/auth.mock'
import type { ApiResult, AuthResponse, User } from '@/models'

export const mockLoginResponse = (
	overrides: Partial<AuthResponse> = {}
): ApiResult<AuthResponse> => ({
	data: mockAuthResponse(overrides),
})

export const mockRegisterResponse = (
	overrides: Partial<AuthResponse> = {}
): ApiResult<AuthResponse> => ({
	data: mockAuthResponse(overrides),
})

export const mockCurrentUserResponse = (overrides: Partial<User> = {}): ApiResult<User> => ({
	data: mockUser(overrides),
})
