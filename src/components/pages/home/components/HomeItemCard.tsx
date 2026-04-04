import './HomeItemCard.css'

import { useEffect,useState } from 'react'

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
}

export function HomeItemCard({ item, onUpdate, onDelete, onCook }: HomeItemCardProps) {
	const [isEditing, setIsEditing] = useState(false)
	const [quantity, setQuantity] = useState(item.quantity)
	const [location, setLocation] = useState<HomeLocation>(item.location)
	const [showCookMenu, setShowCookMenu] = useState(false)
	const [variants, setVariants] = useState<IngredientVariant[]>([])
	const [loadingVariants, setLoadingVariants] = useState(false)

	const rawName = item.recipe?.title || item.ingredient?.name || 'Item desconocido'
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
					{isRecipe && <span className='home-item-badge'>Receta</span>}
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
							<option value='nevera'>Nevera</option>
							<option value='congelador'>Congelador</option>
							<option value='despensa'>Despensa</option>
						</select>
					</div>
				) : (
					<div className='home-item-quantity'>
						<span className='home-item-qty'>{item.quantity}</span>
						{((item.pendingPrepServings || 0) > 0 || (item.plannedMealServings || 0) > 0) && (
							<span className='home-item-projected' title='Te quedarán'>
								({item.projectedTotal ?? item.quantity})
							</span>
						)}
						<span className='home-item-unit'>{item.unit}</span>
						{((item.pendingPrepServings || 0) > 0 || (item.plannedMealServings || 0) > 0) && (
							<span className='home-item-changes'>
								{(item.pendingPrepServings || 0) > 0 && (
									<span className='change-add' title='A preparar'>
										+{item.pendingPrepServings}
									</span>
								)}
								{(item.plannedMealServings || 0) > 0 && (
									<span className='change-sub' title='Vas a consumir'>
										−{item.plannedMealServings}
									</span>
								)}
							</span>
						)}
					</div>
				)}
			</div>

			<div className='home-item-meta'>
				<span className='home-item-date'>Añadido {formatDate(item.addedAt)}</span>
				{item.expiresAt && (
					<span className='home-item-expires'>Caduca {formatDate(item.expiresAt)}</span>
				)}
			</div>

			<div className='home-item-actions'>
				{isEditing ? (
					<>
						<button className='btn-icon btn-icon-success' onClick={handleSave} title='Guardar'>
							<svg
								width='16'
								height='16'
								fill='none'
								stroke='currentColor'
								strokeWidth='2'
								viewBox='0 0 24 24'>
								<polyline points='20 6 9 17 4 12'></polyline>
							</svg>
						</button>
						<button className='btn-icon' onClick={handleCancel} title='Cancelar'>
							<svg
								width='16'
								height='16'
								fill='none'
								stroke='currentColor'
								strokeWidth='2'
								viewBox='0 0 24 24'>
								<line x1='18' y1='6' x2='6' y2='18'></line>
								<line x1='6' y1='6' x2='18' y2='18'></line>
							</svg>
						</button>
					</>
				) : (
					<>
						{isIngredient && (
							<div className='cook-menu-wrapper'>
								<button
									className='btn-icon btn-icon-cook'
									onClick={() => setShowCookMenu(!showCookMenu)}
									title='Cocinar/Preparar'>
									🍳
								</button>
								{showCookMenu && (
									<div className='cook-dropdown'>
										<div className='cook-dropdown-header'>Transformar a:</div>
										{loadingVariants ? (
											<div className='cook-dropdown-loading'>Cargando...</div>
										) : availableTargetVariants.length === 0 ? (
											<div className='cook-dropdown-empty'>No hay otros estados</div>
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
						<button className='btn-icon' onClick={() => setIsEditing(true)} title='Editar'>
							<svg
								width='16'
								height='16'
								fill='none'
								stroke='currentColor'
								strokeWidth='2'
								viewBox='0 0 24 24'>
								<path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'></path>
								<path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'></path>
							</svg>
						</button>
						<button
							className='btn-icon btn-icon-danger'
							onClick={() => onDelete(item.id)}
							title='Eliminar'>
							<svg
								width='16'
								height='16'
								fill='none'
								stroke='currentColor'
								strokeWidth='2'
								viewBox='0 0 24 24'>
								<polyline points='3 6 5 6 21 6'></polyline>
								<path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'></path>
							</svg>
						</button>
					</>
				)}
			</div>
		</div>
	)
}
