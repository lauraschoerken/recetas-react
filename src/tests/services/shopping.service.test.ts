import { beforeEach, describe, expect, it, vi } from 'vitest'

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }))

vi.mock('@/services/api', () => ({
	api: {
		post: postMock,
	},
}))

import { shoppingService } from '@/services/shopping'

describe('shoppingService.importWeekPlanJson', () => {
	beforeEach(() => postMock.mockReset())

	it('accepts the documented entries wrapper', async () => {
		const entries = [{ kind: 'manual', date: '2026-09-27', title: 'Desayuno' }]
		postMock.mockResolvedValue({ importedCount: 1, entries: [] })

		await shoppingService.importWeekPlanJson(JSON.stringify({ entries }))

		expect(postMock).toHaveBeenCalledWith('/week-plan/import', { entries })
	})

	it('also accepts a top-level array', async () => {
		const entries = [{ kind: 'ingredient', date: '2026-09-27', ingredientName: 'Plátano', quantity: 1 }]
		postMock.mockResolvedValue({ importedCount: 1, entries: [] })

		await shoppingService.importWeekPlanJson(entries)

		expect(postMock).toHaveBeenCalledWith('/week-plan/import', { entries })
	})

	it('rejects JSON without entries before calling the API', async () => {
		await expect(shoppingService.importWeekPlanJson('{"other":[]}')).rejects.toThrow(
			'El JSON no contiene entradas'
		)
		expect(postMock).not.toHaveBeenCalled()
	})
})
