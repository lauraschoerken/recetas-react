import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
	getStoredRecipeCardStyle,
	RECIPE_CARD_STYLE_EVENT,
	RECIPE_CARD_STYLE_KEY,
	setStoredRecipeCardStyle,
} from '@/utils/recipeCardStyle'

describe('recipe card style preference', () => {
	const values = new Map<string, string>()

	beforeEach(() => {
		values.clear()
		vi.mocked(window.localStorage.getItem).mockImplementation((key) => values.get(key) ?? null)
		vi.mocked(window.localStorage.setItem).mockImplementation((key, value) => {
			values.set(key, value)
		})
	})

	it('uses the compact visual layout by default', () => {
		expect(getStoredRecipeCardStyle()).toBe('visual')
	})

	it('persists a valid layout and notifies mounted lists', () => {
		const listener = vi.fn()
		window.addEventListener(RECIPE_CARD_STYLE_EVENT, listener)

		setStoredRecipeCardStyle('minimal')

		expect(window.localStorage.getItem(RECIPE_CARD_STYLE_KEY)).toBe('minimal')
		expect(getStoredRecipeCardStyle()).toBe('minimal')
		expect(listener).toHaveBeenCalledOnce()
		window.removeEventListener(RECIPE_CARD_STYLE_EVENT, listener)
	})

	it('ignores an unknown stored value', () => {
		window.localStorage.setItem(RECIPE_CARD_STYLE_KEY, 'unknown')
		expect(getStoredRecipeCardStyle()).toBe('visual')
	})
})
