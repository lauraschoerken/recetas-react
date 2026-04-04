import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'

// Mock localStorage
const localStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock window.confirm
window.confirm = vi.fn(() => true)

// Mock window.alert
window.alert = vi.fn()

// Reset mocks after each test
afterEach(() => {
	vi.clearAllMocks()
})
