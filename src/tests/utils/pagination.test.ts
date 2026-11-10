import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
	getStoredPageSize,
	setStoredPageSize,
} from '@/utils/pagination/usePagination'

describe('page size preferences', () => {
	beforeEach(() => {
		const values = new Map<string, string>()
		vi.mocked(localStorage.getItem).mockImplementation((key) => values.get(key) ?? null)
		vi.mocked(localStorage.setItem).mockImplementation((key, value) => {
			values.set(key, value)
		})
	})

	it('uses a useful default for each list', () => {
		expect(getStoredPageSize('recipes')).toBe(30)
		expect(getStoredPageSize('ingredients')).toBe(100)
		expect(getStoredPageSize('home')).toBe(50)
	})

	it('stores each list preference independently', () => {
		setStoredPageSize('recipes', 20)
		setStoredPageSize('ingredients', 150)

		expect(getStoredPageSize('recipes')).toBe(20)
		expect(getStoredPageSize('ingredients')).toBe(150)
		expect(getStoredPageSize('home')).toBe(50)
	})

	it('keeps compatibility with the previous global preference', () => {
		localStorage.setItem('pagination_pageSize', '100')

		expect(getStoredPageSize('recipes')).toBe(100)
		expect(getStoredPageSize('ingredients')).toBe(100)
	})
})
