import type {
	CookIngredientResult,
	CreateHomeItemData,
	HomeItem,
	UpdateHomeItemData,
} from '@/models'

export const mockHomeItem = (overrides: Partial<HomeItem> = {}): HomeItem => ({
	id: 1,
	location: 'nevera',
	quantity: 2,
	unit: 'raciones',
	addedAt: '2026-04-04T00:00:00.000Z',
	recipe: { id: 1, title: 'Pollo al horno' },
	...overrides,
})

export const mockCreateHomeItemData = (
	overrides: Partial<CreateHomeItemData> = {}
): CreateHomeItemData => ({
	location: 'despensa',
	quantity: 1,
	unit: 'kg',
	ingredientName: 'arroz',
	...overrides,
})

export const mockUpdateHomeItemData = (
	overrides: Partial<UpdateHomeItemData> = {}
): UpdateHomeItemData => ({
	quantity: 3,
	...overrides,
})

export const mockCookIngredientResult = (
	overrides: Partial<CookIngredientResult> = {}
): CookIngredientResult => ({
	success: true,
	cookedItem: mockHomeItem({ id: 2, location: 'nevera' }),
	message: 'Ingrediente cocinado',
	...overrides,
})
