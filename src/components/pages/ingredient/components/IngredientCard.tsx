import './IngredientCard.scss'

import { useTranslation } from 'react-i18next'

import { CalendarAddIcon, DeleteIcon, EditIcon } from '@/components/shared/icons'
import { IngredientThreshold } from '@/services/alert'
import { Ingredient, IngredientVariant } from '@/services/ingredient'
import { UserStore } from '@/services/store'

interface IngredientCardProps {
	ingredient: Ingredient
	thresholdData?: IngredientThreshold | null
	stores?: UserStore[]
	onUpdate: (id: number, data: { preferredUnit?: string | null }) => void
	onDelete: (id: number) => void
	onEdit?: (ingredient: Ingredient) => void
	onConversionChange?: () => void
	onThresholdChange?: () => void
	onAddToShopping?: (ingredient: Ingredient) => void
	onAddToWeekPlan?: (ingredient: Ingredient) => void
}

export function IngredientCard({
	ingredient,
	thresholdData,
	stores = [],
	onDelete,
	onEdit,
	onAddToShopping,
	onAddToWeekPlan,
}: IngredientCardProps) {
	const { t } = useTranslation()

	const variants = ingredient.variants || []
	const defaultVariant = variants.find((v) => v.isDefault) || variants[0]

	const formatMacros = (v: IngredientVariant): string => {
		const parts: string[] = []
		if (v.calories != null) parts.push(`${v.calories} kcal`)
		if (v.protein != null) parts.push(`${v.protein}g P`)
		if (v.carbs != null) parts.push(`${v.carbs}g C`)
		if (v.fat != null) parts.push(`${v.fat}g G`)
		return parts.join(' | ')
	}

	const capitalizedName = ingredient.name.charAt(0).toUpperCase() + ingredient.name.slice(1)

	return (
		<div className='ingredient-card'>
			<div
				className='card-clickable'
				onClick={() => onEdit?.(ingredient)}
				role='button'
				tabIndex={0}
				onKeyDown={(e) => e.key === 'Enter' && onEdit?.(ingredient)}>
				{ingredient.imageUrl ? (
					<img
						src={ingredient.imageUrl}
						alt={capitalizedName}
						className='card-image'
						onError={(e) => (e.currentTarget.style.display = 'none')}
					/>
				) : (
					<div className='card-image-placeholder' />
				)}
				<div className='card-info'>
					<div className='card-title-row'>
						<span className='ingredient-name'>{capitalizedName}</span>
						<span className='ingredient-unit-badge'>{ingredient.unit}</span>
					</div>
					<p className='card-macros'>
						{defaultVariant
							? formatMacros(defaultVariant) || t('ingredients.noNutrition')
							: t('ingredients.noNutrition')}
					</p>

					{/* Cantidad mínima */}
					{thresholdData && (
						<p className='card-meta'>
							<span className='card-meta__label'>{t('ingredients.minQtyShort')}</span>
							{thresholdData.minQuantity} {thresholdData.unit}
						</p>
					)}

					{/* Unidad en lista de compra */}
					{ingredient.preferredUnit && (
						<p className='card-meta'>
							<span className='card-meta__label'>{t('ingredients.preferredUnitShort')}</span>
							{ingredient.preferredUnit}
						</p>
					)}

					{/* Tiendas donde se compra */}
					{stores.length > 0 && (
						<p className='card-meta'>
							<span className='card-meta__label'>{t('ingredients.storesShort')}</span>
							{stores.map((s) => s.name).join(', ')}
						</p>
					)}
				</div>
			</div>

			<div className='card-quick-actions'>
				{onAddToShopping && (
					<button
						className='card-action-btn'
						onClick={(e) => {
							e.stopPropagation()
							onAddToShopping(ingredient)
						}}
						title={t('ingredients.addToShopping')}>
						+
					</button>
				)}
				{onAddToWeekPlan && (
					<button
						className='card-action-btn'
						onClick={(e) => {
							e.stopPropagation()
							onAddToWeekPlan(ingredient)
						}}
						title={t('ingredients.addToWeekPlan')}>
						<CalendarAddIcon size={13} aria-hidden='true' />
					</button>
				)}
				<button
					className='card-action-btn'
					onClick={(e) => {
						e.stopPropagation()
						onEdit?.(ingredient)
					}}
					title={t('edit')}>
					<EditIcon size={13} aria-hidden='true' />
				</button>
				<button
					className='card-action-btn card-action-btn--danger'
					onClick={(e) => {
						e.stopPropagation()
						onDelete(ingredient.id)
					}}
					title={t('delete')}>
					<DeleteIcon size={13} aria-hidden='true' />
				</button>
			</div>
		</div>
	)
}
