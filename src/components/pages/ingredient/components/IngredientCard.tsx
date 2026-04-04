import './IngredientCard.css'

import { useState } from 'react'

import {
	Ingredient,
	ingredientService,
	IngredientVariant,
	UnitConversion,
	UpdateIngredientData,
} from '@/services/ingredient'

interface IngredientCardProps {
	ingredient: Ingredient
	onUpdate: (id: number, data: UpdateIngredientData) => void
	onDelete: (id: number) => void
	onConversionChange?: () => void
}

export function IngredientCard({
	ingredient,
	onUpdate,
	onDelete,
	onConversionChange,
}: IngredientCardProps) {
	const [isEditing, setIsEditing] = useState(false)
	const [showConversions, setShowConversions] = useState(false)
	const [showVariants, setShowVariants] = useState(false)
	const [name, setName] = useState(ingredient.name)
	const [imageUrl, setImageUrl] = useState(ingredient.imageUrl ?? '')

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

	const variants = ingredient.variants || []
	const defaultVariant = variants.find((v) => v.isDefault) || variants[0]
	const conversions = ingredient.conversions || []

	const handleSave = () => {
		onUpdate(ingredient.id, {
			name: name.charAt(0).toUpperCase() + name.slice(1),
			imageUrl: imageUrl || null,
		})
		setIsEditing(false)
	}

	const handleCancel = () => {
		setName(ingredient.name)
		setImageUrl(ingredient.imageUrl ?? '')
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
							placeholder='Nombre'
						/>
						<span className='unit-display'>{ingredient.unit}</span>
					</div>

					<div className='image-url-row'>
						<input
							type='url'
							className='form-input'
							value={imageUrl}
							onChange={(e) => setImageUrl(e.target.value)}
							placeholder='URL de imagen (opcional)'
						/>
						{imageUrl && <img src={imageUrl} alt='Preview' className='image-preview-small' />}
					</div>

					<div className='ingredient-edit-actions'>
						<button className='btn btn-outline' onClick={handleCancel}>
							Cancelar
						</button>
						<button className='btn btn-primary' onClick={handleSave}>
							Guardar
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
							<span className='macro-label'>kcal</span>
						</div>
					)}
					{defaultVariant.protein != null && (
						<div className='macro-item macro-protein'>
							<span className='macro-value'>{defaultVariant.protein}g</span>
							<span className='macro-label'>prot</span>
						</div>
					)}
					{defaultVariant.carbs != null && (
						<div className='macro-item macro-carbs'>
							<span className='macro-value'>{defaultVariant.carbs}g</span>
							<span className='macro-label'>carbs</span>
						</div>
					)}
					{defaultVariant.fat != null && (
						<div className='macro-item macro-fat'>
							<span className='macro-value'>{defaultVariant.fat}g</span>
							<span className='macro-label'>grasa</span>
						</div>
					)}
					{defaultVariant.fiber != null && (
						<div className='macro-item macro-fiber'>
							<span className='macro-value'>{defaultVariant.fiber}g</span>
							<span className='macro-label'>fibra</span>
						</div>
					)}
				</div>
			) : (
				<p className='ingredient-no-macros'>Sin información nutricional</p>
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
											placeholder='Nombre del estado'
										/>
										<div className='variant-macros-grid'>
											<input
												type='number'
												className='form-input form-input-sm'
												value={variantCalories}
												onChange={(e) => setVariantCalories(e.target.value)}
												placeholder='kcal'
												min={0}
											/>
											<input
												type='number'
												className='form-input form-input-sm'
												value={variantProtein}
												onChange={(e) => setVariantProtein(e.target.value)}
												placeholder='prot'
												min={0}
												step={0.1}
											/>
											<input
												type='number'
												className='form-input form-input-sm'
												value={variantCarbs}
												onChange={(e) => setVariantCarbs(e.target.value)}
												placeholder='carbs'
												min={0}
												step={0.1}
											/>
											<input
												type='number'
												className='form-input form-input-sm'
												value={variantFat}
												onChange={(e) => setVariantFat(e.target.value)}
												placeholder='grasa'
												min={0}
												step={0.1}
											/>
											<input
												type='number'
												className='form-input form-input-sm'
												value={variantFiber}
												onChange={(e) => setVariantFiber(e.target.value)}
												placeholder='fibra'
												min={0}
												step={0.1}
											/>
											<input
												type='number'
												className='form-input form-input-sm weight-factor-input'
												value={variantWeightFactor}
												onChange={(e) => setVariantWeightFactor(e.target.value)}
												placeholder='×peso'
												min={0.1}
												step={0.1}
											/>
										</div>
										<div className='variant-edit-actions'>
											<button className='btn btn-sm btn-outline' onClick={cancelEditVariant}>
												Cancelar
											</button>
											<button className='btn btn-sm btn-primary' onClick={saveVariant}>
												Guardar
											</button>
										</div>
									</div>
								) : (
									<>
										<div className='variant-info'>
											<span className='variant-name'>
												{variant.name}
												{variant.isDefault && <span className='default-badge'>predeterminado</span>}
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
													title='Establecer como predeterminado'>
													★
												</button>
											)}
											<button
												className='btn-icon-small'
												onClick={() => startEditVariant(variant)}
												title='Editar'>
												✎
											</button>
											{variants.length > 1 && (
												<button
													className='btn-icon-small btn-danger'
													onClick={() => deleteVariant(variant.id)}
													title='Eliminar'>
													×
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
								placeholder='Nombre del estado (ej: Cocinado, Frito...)'
							/>
							<div className='variant-macros-grid'>
								<input
									type='number'
									className='form-input form-input-sm'
									value={variantCalories}
									onChange={(e) => setVariantCalories(e.target.value)}
									placeholder='kcal'
									min={0}
								/>
								<input
									type='number'
									className='form-input form-input-sm'
									value={variantProtein}
									onChange={(e) => setVariantProtein(e.target.value)}
									placeholder='prot'
									min={0}
									step={0.1}
								/>
								<input
									type='number'
									className='form-input form-input-sm'
									value={variantCarbs}
									onChange={(e) => setVariantCarbs(e.target.value)}
									placeholder='carbs'
									min={0}
									step={0.1}
								/>
								<input
									type='number'
									className='form-input form-input-sm'
									value={variantFat}
									onChange={(e) => setVariantFat(e.target.value)}
									placeholder='grasa'
									min={0}
									step={0.1}
								/>
								<input
									type='number'
									className='form-input form-input-sm'
									value={variantFiber}
									onChange={(e) => setVariantFiber(e.target.value)}
									placeholder='fibra'
									min={0}
									step={0.1}
								/>
								<input
									type='number'
									className='form-input form-input-sm weight-factor-input'
									value={variantWeightFactor}
									onChange={(e) => setVariantWeightFactor(e.target.value)}
									placeholder='×peso'
									min={0.1}
									step={0.1}
								/>
							</div>
							<div className='variant-edit-actions'>
								<button className='btn btn-sm btn-outline' onClick={cancelEditVariant}>
									Cancelar
								</button>
								<button
									className='btn btn-sm btn-primary'
									onClick={addNewVariant}
									disabled={!variantName.trim()}>
									Añadir
								</button>
							</div>
						</div>
					) : (
						<button
							className='btn btn-sm btn-outline add-variant-btn'
							onClick={() => setEditingVariantId(-1)}>
							+ Añadir estado
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
											title='Eliminar'>
											×
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
										<option value=''>Por defecto ({ingredient.unit})</option>
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

			<div className='ingredient-actions'>
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
					onClick={() => onDelete(ingredient.id)}
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
			</div>
		</div>
	)
}
