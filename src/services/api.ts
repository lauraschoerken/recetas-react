const API_MODE = (import.meta.env.VITE_API_MODE as 'mock' | 'api' | 'real' | undefined) ?? 'api'
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? ''
const API_PREFIX = (import.meta.env.VITE_API_PREFIX as string | undefined) ?? '/api'
const API_URL = API_MODE === 'mock' ? '' : `${API_BASE}${API_PREFIX}`

interface RequestOptions {
	method?: string
	body?: unknown
	headers?: Record<string, string>
}

class ApiClient {
	private getToken(): string | null {
		return localStorage.getItem('token')
	}

	private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
		const token = this.getToken()

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			...options.headers,
		}

		if (token) {
			headers['Authorization'] = `Bearer ${token}`
		}

		const response = await fetch(`${API_URL}${endpoint}`, {
			method: options.method || 'GET',
			headers,
			body: options.body ? JSON.stringify(options.body) : undefined,
		})

		if (!response.ok) {
			const error = await response.json().catch(() => ({ error: 'Error de conexión' }))
			throw new Error(error.error || 'Error en la petición')
		}

		if (response.status === 204) {
			return {} as T
		}

		return response.json()
	}

	get<T>(endpoint: string): Promise<T> {
		return this.request<T>(endpoint)
	}

	post<T>(endpoint: string, body: unknown): Promise<T> {
		return this.request<T>(endpoint, { method: 'POST', body })
	}

	put<T>(endpoint: string, body: unknown): Promise<T> {
		return this.request<T>(endpoint, { method: 'PUT', body })
	}

	delete<T>(endpoint: string): Promise<T> {
		return this.request<T>(endpoint, { method: 'DELETE' })
	}
}

export const api = new ApiClient()
