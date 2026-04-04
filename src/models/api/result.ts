export interface ApiResult<T> {
	data: T
	error?: string
}

export type ApiMode = 'mock' | 'real'

export interface ApiErrorPayload {
	error?: string
	message?: string
}
