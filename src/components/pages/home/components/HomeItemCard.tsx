import './HomeItemCard.scss'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
	CalendarAddIcon,
	CheckIcon,
	CloseIcon,
	CookIcon,
	DeleteIcon,
	EditIcon,
} from '@/components/shared/icons'
import { HomeItem, HomeLocation, homeService } from '@/services/home'
import { ingredientService } from '@/services/ingredient'

interface IngredientVariant {
	id: number
	name: string
	weightFactor: number
}

interface HomeItemCardProps {
	item: HomeItem
	onUpdate: (id: number, data: { quantity?: number; location?: HomeLocation }) => void
	onDelete: (id: number) => void
	onCook?: (id: number, result: { success: boolean; message: string }) => void
	onAddToWeekPlan?: (item: HomeItem) => void
	showLocation?: boolean
}

export function HomeItemCard({
	item,
	onUpdate,
	onDelete,
	onCook,
	onAddToWeekPlan,
	showLocation,
}: HomeItemCardProps) {
	const { t } = useTranslation()
	const [isEditing, setIsEditing] = useState(false)
	const [quantity, setQuantity] = useState(item.quantity)
	const [location, setLocation] = useState<HomeLocation>(item.location)
	const [showCookMenu, setShowCookMenu] = useState(false)
	const [variants, setVariants] = useState<IngredientVariant[]>([])
	const [loadingVariants, setLoadingVariants] = useState(false)

	const rawName = item.recipe?.title || item.ingredient?.name || t('homePage.unknownItem')
	const name = rawName.charAt(0).toUpperCase() + rawName.slice(1)
	const isRecipe = !!item.recipe
	const isIngredient = !!item.ingredient
	const currentVariant = item.variant

	useEffect(() => {
		if (showCookMenu && item.ingredientId && variants.length === 0) {
			setLoadingVariants(true)
			ingredientService
				.getVariants(item.ingredientId)
				.then((v) => setVariants(v as IngredientVariant[]))
				.catch(console.error)
				.finally(() => setLoadingVariants(false))
		}
	}, [showCookMenu, item.ingredientId, variants.length])

	const availableTargetVariants = variants.filter((v) => v.id !== item.variantId)

	const handleSave = () => {
		onUpdate(item.id, { quantity, location })
		setIsEditing(false)
	}

	const handleCancel = () => {
		setQuantity(item.quantity)
		setLocation(item.location)
		setIsEditing(false)
	}

	const handleCook = async (targetVariantId: number) => {
		try {
			const result = await homeService.cookIngredient(item.id, { targetVariantId })
			setShowCookMenu(false)
			if (onCook) {
				onCook(item.id, result)
			}
		} catch (error) {
			console.error('Error cooking ingredient:', error)
		}
	}

	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString('es-ES', {
			day: 'numeric',
			month: 'short',
		})
	}

	return (
		<div className={`home-item-card ${isRecipe ? 'is-recipe' : ''}`}>
			<div className='home-item-main'>
				<div className='home-item-info'>
					<span className='home-item-name'>{name}</span>
					{showLocation && (
						<span className='home-item-location-badge'>
							{item.location === 'nevera' ? '❄️' : item.location === 'congelador' ? '🧊' : '🏠'}{' '}
							{item.location}
						</span>
					)}
					{isRecipe && <span className='home-item-badge'>{t('homePage.recipeBadge')}</span>}
					{isIngredient && currentVariant && (
						<span className='home-item-variant-badge'>{currentVariant.name}</span>
					)}
				</div>

				{isEditing ? (
					<div className='home-item-edit'>
						<input
							type='number'
							value={quantity}
							onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
							min={0}
							step={0.1}
							className='form-input home-item-qty-input'
						/>
						<span className='home-item-unit'>{item.unit}</span>
						<select
							value={location}
							onChange={(e) => setLocation(e.target.value as HomeLocation)}
							className='form-input home-item-location-select'>
							<option value='nevera'>{t('homePage.fridge')}</option>
							<option value='congelador'>{t('homePage.freezer')}</option>
							<option value='despensa'>{t('homePage.pantry')}</option>
						</select>
					</div>
				) : (
					<div className='home-item-quantity'>
						<span className='home-item-qty'>{item.quantity}</span>
						{((item.pendingPrepServings || 0) > 0 || (item.plannedMealServings || 0) > 0) && (
							<span className='home-item-projected' title={t('homePage.projected')}>
								({item.projectedTotal ?? item.quantity})
							</span>
						)}
						<span className='home-item-unit'>{item.unit}</span>
						{((item.pendingPrepServings || 0) > 0 || (item.plannedMealServings || 0) > 0) && (
							<span className='home-item-changes'>
								{(item.pendingPrepServings || 0) > 0 && (
									<span className='change-add' title={t('homePage.toPrep')}>
										+{item.pendingPrepServings}
									</span>
								)}
								{(item.plannedMealServings || 0) > 0 && (
									<span className='change-sub' title={t('homePage.willConsume')}>
										−{item.plannedMealServings}
									</span>
								)}
							</span>
						)}
					</div>
				)}
			</div>

			<div className='home-item-meta'>
				<span className='home-item-date'>
					{t('homePage.addedOn', { date: formatDate(item.addedAt) })}
				</span>
				{item.expiresAt && (
					<span className='home-item-expires'>
						{t('homePage.expiresOn', { date: formatDate(item.expiresAt) })}
					</span>
				)}
			</div>

			<div className='home-item-actions'>
				{isEditing ? (
					<>
						<button className='btn-icon btn-icon-success' onClick={handleSave} title={t('save')}>
							<CheckIcon size={16} aria-hidden='true' />
						</button>
						<button className='btn-icon' onClick={handleCancel} title={t('cancel')}>
							<CloseIcon size={16} aria-hidden='true' />
						</button>
					</>
				) : (
					<>
						{isIngredient && (
							<div className='cook-menu-wrapper'>
								<button
									className='btn-icon btn-icon-cook'
									onClick={() => setShowCookMenu(!showCookMenu)}
									title={t('homePage.cookPrepare')}>
									<CookIcon size={16} aria-hidden='true' />
								</button>
								{showCookMenu && (
									<div className='cook-dropdown'>
										<div className='cook-dropdown-header'>{t('homePage.transformTo')}</div>
										{loadingVariants ? (
											<div className='cook-dropdown-loading'>{t('loading')}</div>
										) : availableTargetVariants.length === 0 ? (
											<div className='cook-dropdown-empty'>{t('homePage.noOtherStates')}</div>
										) : (
											availableTargetVariants.map((v) => (
												<button
													key={v.id}
													className='cook-dropdown-option'
													onClick={() => handleCook(v.id)}>
													<span className='cook-option-name'>{v.name}</span>
													{v.weightFactor !== 1 && (
														<span className='cook-option-factor'>×{v.weightFactor}</span>
													)}
												</button>
											))
										)}
									</div>
								)}
							</div>
						)}
						<button className='btn-icon' onClick={() => setIsEditing(true)} title={t('edit')}>
							<EditIcon size={16} aria-hidden='true' />
						</button>
						{onAddToWeekPlan && (
							<button
								className='btn-icon btn-icon-plan'
								onClick={() => onAddToWeekPlan(item)}
								title={t('homePage.addToWeekPlan')}>
								<CalendarAddIcon size={16} aria-hidden='true' />
							</button>
						)}
						<button
							className='btn-icon btn-icon-danger'
							onClick={() => onDelete(item.id)}
							title={t('delete')}>
							<DeleteIcon size={16} aria-hidden='true' />
						</button>
					</>
				)}
			</div>
		</div>
	)
}
