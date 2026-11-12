import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { profileService } from '@/services/profile'
import { Recipe } from '@/services/recipe'
import {
	getStoredRecipeCardStyle,
	RECIPE_CARD_STYLE_EVENT,
	RecipeCardStyle,
	setStoredRecipeCardStyle,
} from '@/utils/recipeCardStyle'

import { RecipeCard } from './RecipeCard'

interface RecipeListProps {
	recipes: Recipe[]
	currentUserId: number
	onDelete: (id: number) => void
	onAddToWeek: (recipe: Recipe) => void
	selectedIds?: Set<number>
	onToggleSelect?: (id: number) => void
	onHide?: (recipe: Recipe) => void
	onUnhide?: (recipe: Recipe) => void
	showingHidden?: boolean
}

export function RecipeList({
	recipes,
	currentUserId,
	onDelete,
	onAddToWeek,
	selectedIds,
	onToggleSelect,
	onHide,
	onUnhide,
	showingHidden = false,
}: RecipeListProps) {
	const { t } = useTranslation()
	const [cardStyle, setCardStyle] = useState<RecipeCardStyle>(getStoredRecipeCardStyle)

	useEffect(() => {
		const handleStyleChange = (event: Event) => {
			setCardStyle((event as CustomEvent<RecipeCardStyle>).detail || getStoredRecipeCardStyle())
		}
		const handleStorage = () => setCardStyle(getStoredRecipeCardStyle())
		window.addEventListener(RECIPE_CARD_STYLE_EVENT, handleStyleChange)
		window.addEventListener('storage', handleStorage)
		return () => {
			window.removeEventListener(RECIPE_CARD_STYLE_EVENT, handleStyleChange)
			window.removeEventListener('storage', handleStorage)
		}
	}, [])

	useEffect(() => {
		void profileService
			.getProfile()
			.then((profile) => {
				if (profile.recipeCardStyle === 'minimal' || profile.recipeCardStyle === 'visual') {
					setStoredRecipeCardStyle(profile.recipeCardStyle)
					setCardStyle(profile.recipeCardStyle)
				}
			})
			.catch(() => undefined)
	}, [])

	if (recipes.length === 0) {
		return (
			<div className='empty-state'>
				<p>{t(showingHidden ? 'recipes.hiddenEmptyTitle' : 'recipes.emptyTitle')}</p>
				<p className='text-secondary text-sm mt-1'>
					{t(showingHidden ? 'recipes.hiddenEmptyHint' : 'recipes.emptyHint')}
				</p>
			</div>
		)
	}

	return (
		<div className={`recipe-list-grid recipe-list-grid--${cardStyle}`}>
			{recipes.map((recipe) => (
				<RecipeCard
					key={recipe.id}
					recipe={recipe}
					currentUserId={currentUserId}
					onDelete={onDelete}
					onAddToWeek={onAddToWeek}
					isSelected={selectedIds?.has(recipe.id)}
					onSelect={onToggleSelect}
					onHide={onHide}
					onUnhide={onUnhide}
					variant={cardStyle}
				/>
			))}
		</div>
	)
}
