export type RecipeCardStyle = 'minimal' | 'visual'

export const RECIPE_CARD_STYLE_KEY = 'recipeCardStyle'
export const RECIPE_CARD_STYLE_EVENT = 'recipe-card-style-change'

export function getStoredRecipeCardStyle(): RecipeCardStyle {
	if (typeof window === 'undefined') return 'visual'
	return window.localStorage.getItem(RECIPE_CARD_STYLE_KEY) === 'minimal' ? 'minimal' : 'visual'
}

export function setStoredRecipeCardStyle(style: RecipeCardStyle) {
	window.localStorage.setItem(RECIPE_CARD_STYLE_KEY, style)
	window.dispatchEvent(new CustomEvent<RecipeCardStyle>(RECIPE_CARD_STYLE_EVENT, { detail: style }))
}
