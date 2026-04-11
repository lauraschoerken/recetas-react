import { useTranslation } from 'react-i18next'

import { Recipe } from '@/services/recipe'

import { RecipeCard } from './RecipeCard'

interface RecipeListProps {
	recipes: Recipe[]
	currentUserId: number
	onDelete: (id: number) => void
	onAddToWeek: (recipe: Recipe) => void
}

export function RecipeList({ recipes, currentUserId, onDelete, onAddToWeek }: RecipeListProps) {
	const { t } = useTranslation()

	if (recipes.length === 0) {
		return (
			<div className='empty-state'>
				<p>{t('recipes.emptyTitle')}</p>
				<p className='text-secondary text-sm mt-1'>{t('recipes.emptyHint')}</p>
			</div>
		)
	}

	return (
		<div className='grid grid-4'>
			{recipes.map((recipe) => (
				<RecipeCard
					key={recipe.id}
					recipe={recipe}
					currentUserId={currentUserId}
					onDelete={onDelete}
					onAddToWeek={onAddToWeek}
				/>
			))}
		</div>
	)
}
