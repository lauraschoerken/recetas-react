import './IngredientCard.scss'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DeleteIcon, EditIcon, StarIcon } from '@/components/shared/icons'
import {
	Ingredient,
	ingredientService,
	IngredientVariant,
	UnitConversion,
	UpdateIngredientData,
} from '@/services/ingredient'
import { alertService } from '@/services/alert'

interface IngredientCardProps {
	ingredient: Ingredient
	onUpdate: (id: number, data: UpdateIngredientData) => void
	onDelete: (id: number) => void
	onConversionChange?: () => void
	onAddToShopping?: (ingredient: Ingredient) => void
	onAddToWeekPlan?: (ingredient: Ingredient) => void
}

export function IngredientCard({
	ingredient,
	onUpdate,
	onDelete,
	onConversionChange,
	onAddToShopping,
	onAddToWeekPlan,
}: IngredientCardProps) {
	const { t } = useTranslation()
	const [isEditing, setIsEditing] = useState(false)
	const [showConversions, setShowConversions] = useState(false)
	const [showVariants, setShowVariants] = useState(false)
	const [name, setName] = useState(ingredient.name)
	const [imageUrl, setImageUrl] = useState(ingredient.imageUrl ?? '')
	const [defaultLocation, setDefaultLocation] = useState(ingredient.defaultLocation ?? '')

	useEffect(() => {
		setName(ingredient.name)
		setImageUrl(ingredient.imageUrl ?? '')
		setDefaultLocation(ingredient.defaultLocation ?? '')
	}, [ingredient])

	const [editingVariantId, setEditingVariantId] = useState<number | null>(null)
	const [variantName, setVariantName] = useState('')
	const [variantCalories, setVariantCalories] = useState('')
	const [variantProtein, setVariantProtein] = useState('')
	const [variantCarbs, setVariantCarbs] = useState('')
	const [variantFat, setVariantFat] = useState('')
	const [variantFiber, setVariantFiber] = useState('')
	const [variantWeightFactor, setVariantWeightFactor] = useState('1')

	const [newUnitName, setNewUnitName] = useState('')
	const [newGramsPerUnit, setNewGramsPerUnit] = useState('')

	const [minQuantity, setMinQuantity] = useState('')
	const [minUnit, setMinUnit] = useState(ingredient.unit || 'g')
	const [hasThreshold, setHasThreshold] = useState(false)
	const [showThreshold, setShowThreshold] = useState(false)

	const variants = ingredient.variants || []
	const defaultVariant = variants.find((v) => v.isDefault) || variants[0]
	const conversions = ingredient.conversions || []

	useEffect(() => {
		alertService
			.getIngredientThresholds()
			.then((thresholds) => {
				const match = thresholds.find((t) => t.ingredientId === ingredient.id)
				if (match) {
					setMinQuantity(match.minQuantity.toString())
					setMinUnit(match.unit)
					setHasThreshold(true)
				} else {
					setMinQuantity('')
					setMinUnit(ingredient.unit || 'g')
					setHasThreshold(false)
				}
			})
			.catch(() => {})
	}, [ingredient.id, ingredient.unit])

	const handleSave = () => {
		onUpdate(ingredient.id, {
			name: name.charAt(0).toUpperCase() + name.slice(1),
			imageUrl: imageUrl || null,
			defaultLocation: defaultLocation || null,
		})
		setIsEditing(false)
	}

	const handleCancel = () => {
		setName(ingredient.name)
		setImageUrl(ingredient.imageUrl ?? '')
		setDefaultLocation(ingredient.defaultLocation ?? '')
		setIsEditing(false)
	}

	const startEditVariant = (variant: IngredientVariant) => {
		setEditingVariantId(variant.id)
		setVariantName(variant.name)
		setVariantCalories(variant.calories?.toString() ?? '')
		setVariantProtein(variant.protein?.toString() ?? '')
		setVariantCarbs(variant.carbs?.toString() ?? '')
		setVariantFat(variant.fat?.toString() ?? '')
		setVariantFiber(variant.fiber?.toString() ?? '')
		setVariantWeightFactor(variant.weightFactor?.toString() ?? '1')
	}

	const cancelEditVariant = () => {
		setEditingVariantId(null)
		setVariantName('')
		setVariantCalories('')
		setVariantProtein('')
		setVariantCarbs('')
		setVariantFat('')
		setVariantFiber('')
		setVariantWeightFactor('1')
	}

	const saveVariant = async () => {
		if (!editingVariantId || !variantName.trim()) return

		try {
			await ingredientService.updateVariant(editingVariantId, {
				name: variantName.trim(),
				calories: variantCalories === '' ? null : Number(variantCalories),
				protein: variantProtein === '' ? null : Number(variantProtein),
				carbs: variantCarbs === '' ? null : Number(variantCarbs),
				fat: variantFat === '' ? null : Number(variantFat),
				fiber: variantFiber === '' ? null : Number(variantFiber),
				weightFactor: variantWeightFactor === '' ? 1 : Number(variantWeightFactor),
			})
			cancelEditVariant()
			onConversionChange?.()
		} catch (error) {
			console.error('Error updating variant:', error)
		}
	}

	const addNewVariant = async () => {
		if (!variantName.trim()) return

		try {
			await ingredientService.addVariant(ingredient.id, {
				name: variantName.trim(),
				calories: variantCalories === '' ? undefined : Number(variantCalories),
				protein: variantProtein === '' ? undefined : Number(variantProtein),
				carbs: variantCarbs === '' ? undefined : Number(variantCarbs),
				fat: variantFat === '' ? undefined : Number(variantFat),
				fiber: variantFiber === '' ? undefined : Number(variantFiber),
				weightFactor: variantWeightFactor === '' ? 1 : Number(variantWeightFactor),
			})
			cancelEditVariant()
			onConversionChange?.()
		} catch (error) {
			console.error('Error adding variant:', error)
		}
	}

	const deleteVariant = async (variantId: number) => {
		try {
			await ingredientService.deleteVariant(variantId)
			onConversionChange?.()
		} catch (error) {
			console.error('Error deleting variant:', error)
		}
	}

	const setAsDefault = async (variantId: number) => {
		try {
			await ingredientService.updateVariant(variantId, { isDefault: true })
			onConversionChange?.()
		} catch (error) {
			console.error('Error setting default:', error)
		}
	}

	const handleAddConversion = async () => {
		if (!newUnitName.trim() || !newGramsPerUnit) return

		try {
			await ingredientService.addConversion(ingredient.id, {
				unitName: newUnitName.trim(),
				gramsPerUnit: Number(newGramsPerUnit),
			})
			setNewUnitName('')
			setNewGramsPerUnit('')
			onConversionChange?.()
		} catch (error) {
			console.error('Error adding conversion:', error)
		}
	}

	const handleDeleteConversion = async (conversionId: number) => {
		try {
			await ingredientService.deleteConversion(conversionId)
			onConversionChange?.()
		} catch (error) {
			console.error('Error deleting conversion:', error)
		}
	}

	const handleSaveThreshold = async () => {
		const min = Number(minQuantity)
		if (!min || min <= 0) return
		try {
			await alertService.setIngredientThreshold({
				ingredientId: ingredient.id,
				minQuantity: min,
				unit: minUnit,
			})
			setHasThreshold(true)
		} catch (error) {
			console.error('Error saving threshold:', error)
		}
	}

	const handleDeleteThreshold = async () => {
		try {
			await alertService.deleteIngredientThreshold(ingredient.id)
			setMinQuantity('')
			setMinUnit(ingredient.unit || 'g')
			setHasThreshold(false)
		} catch (error) {
			console.error('Error deleting threshold:', error)
		}
	}

	const capitalizedName = ingredient.name.charAt(0).toUpperCase() + ingredient.name.slice(1)

	if (isEditing) {
		return (
			<div className='ingredient-card editing'>
				<div className='ingredient-edit-form'>
					<div className='ingredient-edit-row'>
						<input
							type='text'
							className='form-input'
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder={t('ingredients.namePlaceholder')}
						/>
						<span className='unit-display'>{ingredient.unit}</span>
					</div>

					<div className='image-url-row'>
						<input
							type='url'
							className='form-input'
							value={imageUrl}
							onChange={(e) => setImageUrl(e.target.value)}
							placeholder={t('ingredients.imageUrlPlaceholder')}
						/>
						{imageUrl && <img src={imageUrl} alt='Preview' className='image-preview-small' />}
					</div>

					<div className='ingredient-edit-row'>
						<label className='form-label'>{t('ingredients.defaultLocationLabel')}</label>
						<select
							className='form-input'
							value={defaultLocation}
							onChange={(e) => setDefaultLocation(e.target.value)}>
							<option value=''>{t('recipes.noPreference')}</option>
							<option value='nevera'>{t('homePage.fridge')}</option>
							<option value='congelador'>{t('homePage.freezer')}</option>
							<option value='despensa'>{t('homePage.pantry')}</option>
						</select>
					</div>

					<div className='ingredient-edit-actions'>
						<button className='btn btn-outline' onClick={handleCancel}>
							{t('cancel')}
						</button>
						<button className='btn btn-primary' onClick={handleSave}>
							{t('save')}
						</button>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className='ingredient-card'>
			<div className='ingredient-header'>
				<h3 className='ingredient-name'>{capitalizedName}</h3>
				<span className='ingredient-unit'>{ingredient.unit}</span>
			</div>

			{defaultVariant ? (
				<div className='ingredient-macros'>
					<div className='variant-label'>{defaultVariant.name}</div>
					{defaultVariant.calories != null && (
						<div className='macro-item macro-calories'>
							<span className='macro-value'>{defaultVariant.calories}</span>
							<span className='macro-label'>{t('weekPlan.kcal')}</span>
						</div>
					)}
					{defaultVariant.protein != null && (
						<div className='macro-item macro-protein'>
							<span className='macro-value'>{defaultVariant.protein}g</span>
							<span className='macro-label'>{t('weekPlan.prot')}</span>
						</div>
					)}
					{defaultVariant.carbs != null && (
						<div className='macro-item macro-carbs'>
							<span className='macro-value'>{defaultVariant.carbs}g</span>
							<span className='macro-label'>{t('weekPlan.carbsShort')}</span>
						</div>
					)}
					{defaultVariant.fat != null && (
						<div className='macro-item macro-fat'>
							<span className='macro-value'>{defaultVariant.fat}g</span>
							<span className='macro-label'>{t('weekPlan.fatShort')}</span>
						</div>
					)}
					{defaultVariant.fiber != null && (
						<div className='macro-item macro-fiber'>
							<span className='macro-value'>{defaultVariant.fiber}g</span>
							<span className='macro-label'>{t('fiber')}</span>
						</div>
					)}
				</div>
			) : (
				<p className='ingredient-no-macros'>{t('ingredients.noNutrition')}</p>
			)}

			<button className='variants-toggle' onClick={() => setShowVariants(!showVariants)}>
				{showVariants ? '▼' : '▶'} Estados ({variants.length})
			</button>

			{showVariants && (
				<div className='variants-panel'>
					<div className='variants-list'>
						{variants.map((variant) => (
							<div
								key={variant.id}
								className={`variant-item ${variant.isDefault ? 'is-default' : ''}`}>
								{editingVariantId === variant.id ? (
									<div className='variant-edit-form'>
										<input
											type='text'
											className='form-input form-input-sm'
											value={variantName}
											onChange={(e) => setVariantName(e.target.value)}
											placeholder={t('ingredients.variantsPlaceholder')}
										/>
										<div className='variant-macros-grid'>
											<input
												type='number'
												className='form-input form-input-sm'
												value={variantCalories}
												onChange={(e) => setVariantCalories(e.target.value)}
												placeholder={t('weekPlan.kcal')}
												min={0}
											/>
											<input
												type='number'
												className='form-input form-input-sm'
												value={variantProtein}
												onChange={(e) => setVariantProtein(e.target.value)}
												placeholder={t('weekPlan.prot')}
												min={0}
												step={0.1}
											/>
											<input
												type='number'
												className='form-input form-input-sm'
												value={variantCarbs}
												onChange={(e) => setVariantCarbs(e.target.value)}
												placeholder={t('weekPlan.carbsShort')}
												min={0}
												step={0.1}
											/>
											<input
												type='number'
												className='form-input form-input-sm'
												value={variantFat}
												onChange={(e) => setVariantFat(e.target.value)}
												placeholder={t('weekPlan.fatShort')}
												min={0}
												step={0.1}
											/>
											<input
												type='number'
												className='form-input form-input-sm'
												value={variantFiber}
												onChange={(e) => setVariantFiber(e.target.value)}
												placeholder={t('fiber')}
												min={0}
												step={0.1}
											/>
											<input
												type='number'
												className='form-input form-input-sm weight-factor-input'
												value={variantWeightFactor}
												onChange={(e) => setVariantWeightFactor(e.target.value)}
												placeholder={t('ingredients.weightFactor')}
												min={0.1}
												step={0.1}
											/>
										</div>
										<div className='variant-edit-actions'>
											<button className='btn btn-sm btn-outline' onClick={cancelEditVariant}>
												{t('cancel')}
											</button>
											<button className='btn btn-sm btn-primary' onClick={saveVariant}>
												{t('save')}
											</button>
										</div>
									</div>
								) : (
									<>
										<div className='variant-info'>
											<span className='variant-name'>
												{variant.name}
												{variant.isDefault && <span className='default-badge'>{t('default')}</span>}
											</span>
											<span className='variant-macros-summary'>
												{variant.calories != null && `${variant.calories}kcal`}
												{variant.protein != null && ` · ${variant.protein}g prot`}
												{variant.carbs != null && ` · ${variant.carbs}g carbs`}
												{variant.weightFactor != null && variant.weightFactor !== 1 && (
													<span className='weight-factor-badge'> · ×{variant.weightFactor}</span>
												)}
											</span>
										</div>
										<div className='variant-actions'>
											{!variant.isDefault && (
												<button
													className='btn-icon-small'
													onClick={() => setAsDefault(variant.id)}
													title={t('recipes.defaultBadge')}>
													<StarIcon size={14} aria-hidden='true' />
												</button>
											)}
											<button
												className='btn-icon-small'
												onClick={() => startEditVariant(variant)}
												title={t('edit')}>
												<EditIcon size={14} aria-hidden='true' />
											</button>
											{variants.length > 1 && (
												<button
													className='btn-icon-small btn-danger'
													onClick={() => deleteVariant(variant.id)}
													title={t('delete')}>
													<DeleteIcon size={14} aria-hidden='true' />
												</button>
											)}
										</div>
									</>
								)}
							</div>
						))}
					</div>

					{editingVariantId === -1 ? (
						<div className='variant-edit-form new-variant-form'>
							<input
								type='text'
								className='form-input form-input-sm'
								value={variantName}
								onChange={(e) => setVariantName(e.target.value)}
								placeholder={t('ingredients.variantsPlaceholder')}
							/>
							<div className='variant-macros-grid'>
								<input
									type='number'
									className='form-input form-input-sm'
									value={variantCalories}
									onChange={(e) => setVariantCalories(e.target.value)}
									placeholder={t('weekPlan.kcal')}
									min={0}
								/>
								<input
									type='number'
									className='form-input form-input-sm'
									value={variantProtein}
									onChange={(e) => setVariantProtein(e.target.value)}
									placeholder={t('weekPlan.prot')}
									min={0}
									step={0.1}
								/>
								<input
									type='number'
									className='form-input form-input-sm'
									value={variantCarbs}
									onChange={(e) => setVariantCarbs(e.target.value)}
									placeholder={t('weekPlan.carbsShort')}
									min={0}
									step={0.1}
								/>
								<input
									type='number'
									className='form-input form-input-sm'
									value={variantFat}
									onChange={(e) => setVariantFat(e.target.value)}
									placeholder={t('weekPlan.fatShort')}
									min={0}
									step={0.1}
								/>
								<input
									type='number'
									className='form-input form-input-sm'
									value={variantFiber}
									onChange={(e) => setVariantFiber(e.target.value)}
									placeholder={t('fiber')}
									min={0}
									step={0.1}
								/>
								<input
									type='number'
									className='form-input form-input-sm weight-factor-input'
									value={variantWeightFactor}
									onChange={(e) => setVariantWeightFactor(e.target.value)}
									placeholder={t('ingredients.weightFactor')}
									min={0.1}
									step={0.1}
								/>
							</div>
							<div className='variant-edit-actions'>
								<button className='btn btn-sm btn-outline' onClick={cancelEditVariant}>
									{t('cancel')}
								</button>
								<button
									className='btn btn-sm btn-primary'
									onClick={addNewVariant}
									disabled={!variantName.trim()}>
									{t('add')}
								</button>
							</div>
						</div>
					) : (
						<button
							className='btn btn-sm btn-outline add-variant-btn'
							onClick={() => setEditingVariantId(-1)}>
							{t('ingredients.addState')}
						</button>
					)}
				</div>
			)}

			<button className='conversions-toggle' onClick={() => setShowConversions(!showConversions)}>
				{showConversions ? '▼' : '▶'} Conversiones ({conversions.length})
			</button>

			{showConversions && (
				<div className='conversions-panel'>
					{conversions.length > 0 && (
						<>
							<div className='conversions-list'>
								{conversions.map((conv: UnitConversion) => (
									<div key={conv.id} className='conversion-item'>
										<span>
											1 {conv.unitName} = {conv.gramsPerUnit}
											{ingredient.unit}
										</span>
										<button
											className='btn-icon-small'
											onClick={() => handleDeleteConversion(conv.id)}
											title={t('delete')}>
											<DeleteIcon size={14} aria-hidden='true' />
										</button>
									</div>
								))}
							</div>

							<div className='preferred-unit-section'>
								<label className='preferred-unit-label'>
									<span>📋 Unidad en lista de compra:</span>
									<select
										className='form-select form-select-sm'
										value={ingredient.preferredUnit || ''}
										onChange={(e) => {
											onUpdate(ingredient.id, {
												preferredUnit: e.target.value || null,
											})
										}}>
										<option value=''>
											{t('ingredients.defaultUnit', { unit: ingredient.unit })}
										</option>
										{conversions.map((conv: UnitConversion) => (
											<option key={conv.id} value={conv.unitName}>
												{conv.unitName} ({conv.gramsPerUnit}
												{ingredient.unit})
											</option>
										))}
									</select>
								</label>
							</div>
						</>
					)}

					<div className='add-conversion-form'>
						<input
							type='text'
							className='form-input form-input-sm'
							placeholder='Unidad (ej: diente)'
							value={newUnitName}
							onChange={(e) => setNewUnitName(e.target.value)}
						/>
						<input
							type='number'
							className='form-input form-input-sm'
							placeholder={ingredient.unit}
							value={newGramsPerUnit}
							onChange={(e) => setNewGramsPerUnit(e.target.value)}
							min={0}
							step={0.1}
						/>
						<button
							className='btn btn-sm btn-primary'
							onClick={handleAddConversion}
							disabled={!newUnitName.trim() || !newGramsPerUnit}>
							+
						</button>
					</div>
				</div>
			)}

			<button className='threshold-toggle' onClick={() => setShowThreshold(!showThreshold)}>
				{showThreshold ? '▼' : '▶'} {t('ingredients.minQuantity')}{' '}
				{hasThreshold && <span className='threshold-active-badge'>✓</span>}
			</button>

			{showThreshold && (
				<div className='threshold-panel'>
					<p className='form-hint'>{t('ingredients.minQuantityHint')}</p>
					<div className='threshold-form'>
						<input
							type='number'
							className='form-input form-input-sm'
							placeholder={t('ingredients.quantityPlaceholder')}
							value={minQuantity}
							onChange={(e) => setMinQuantity(e.target.value)}
							min={0}
							step={0.1}
						/>
						<select
							className='form-select form-select-sm'
							value={minUnit}
							onChange={(e) => setMinUnit(e.target.value)}>
							<option value={ingredient.unit}>{ingredient.unit}</option>
							{conversions.map((conv: UnitConversion) => (
								<option key={conv.id} value={conv.unitName}>
									{conv.unitName}
								</option>
							))}
						</select>
						<button
							className='btn btn-sm btn-primary'
							onClick={handleSaveThreshold}
							disabled={!minQuantity || Number(minQuantity) <= 0}>
							{t('save')}
						</button>
						{hasThreshold && (
							<button
								className='btn-icon-small btn-danger'
								onClick={handleDeleteThreshold}
								title={t('ingredients.removeThreshold')}>
								<DeleteIcon size={14} aria-hidden='true' />
							</button>
						)}
					</div>
				</div>
			)}

			<div className='ingredient-actions'>
				{onAddToShopping && (
					<button
						className='btn-icon'
						onClick={() => onAddToShopping(ingredient)}
						title={t('ingredients.addToShopping')}>
						🛒
					</button>
				)}
				{onAddToWeekPlan && (
					<button
						className='btn-icon'
						onClick={() => onAddToWeekPlan(ingredient)}
						title={t('ingredients.addToWeekPlan')}>
						📅
					</button>
				)}
				<button className='btn-icon' onClick={() => setIsEditing(true)} title={t('edit')}>
					<EditIcon size={16} aria-hidden='true' />
				</button>
				<button
					className='btn-icon btn-icon-danger'
					onClick={() => onDelete(ingredient.id)}
					title={t('delete')}>
					<DeleteIcon size={16} aria-hidden='true' />
				</button>
			</div>
		</div>
	)
}
