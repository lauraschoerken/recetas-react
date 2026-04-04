import './NutritionEditor.css'

import { useEffect, useMemo,useState } from 'react'

import { IngredientVariant } from '@/services/recipe'

interface NutritionIngredient {
	id: number
	name: string
	quantity: number
	unit: string
	variantId?: number | null
	variantName?: string
	cookedVariantId?: number | null
	cookedVariantName?: string
	variants?: IngredientVariant[]
	source: 'direct' | 'component' | 'recipe'
	componentName?: string
	componentIndex?: number
	optionIndex?: number
	isRecipe?: boolean
	servings?: number
	isSelected?: boolean
}

interface CustomMacros {
	customCalories?: number | null
	customProtein?: number | null
	customCarbs?: number | null
	customFat?: number | null
	customFiber?: number | null
}

interface IngredientUpdate {
	index: number
	cookedVariantId: number | null
	source: 'direct' | 'component' | 'recipe'
	componentIndex?: number
	optionIndex?: number
}

interface NutritionEditorProps {
	ingredients: NutritionIngredient[]
	customMacros: CustomMacros
	servings: number
	onChange: (data: { ingredientUpdates: IngredientUpdate[]; customMacros: CustomMacros }) => void
}

interface CalculatedNutrition {
	calories: number
	protein: number
	carbs: number
	fat: number
	fiber: number
}

export function NutritionEditor({
	ingredients,
	customMacros,
	servings,
	onChange,
}: NutritionEditorProps) {
	const [useCustomMacros, setUseCustomMacros] = useState(customMacros.customCalories != null)
	const [localCustomMacros, setLocalCustomMacros] = useState<CustomMacros>(customMacros)
	const [cookedVariants, setCookedVariants] = useState<Record<number, number | null>>({})

	// Crear un key único para detectar cambios en la estructura de ingredients
	const ingredientsKey = ingredients.map((i) => `${i.id}-${i.name}`).join('|')

	useEffect(() => {
		// Inicializar cookedVariants cuando cambia la estructura de ingredients
		const initial: Record<number, number | null> = {}
		ingredients.forEach((ing, idx) => {
			initial[idx] = ing.cookedVariantId || null
		})
		setCookedVariants(initial)
	}, [ingredientsKey])

	useEffect(() => {
		setUseCustomMacros(customMacros.customCalories != null)
		setLocalCustomMacros(customMacros)
	}, [customMacros])

	const calculatedNutrition = useMemo<CalculatedNutrition>(() => {
		let calories = 0,
			protein = 0,
			carbs = 0,
			fat = 0,
			fiber = 0

		for (let i = 0; i < ingredients.length; i++) {
			const ing = ingredients[i]

			// Solo calcular para ingredientes directos, recetas, o componentes seleccionados
			if (ing.source === 'component' && !ing.isSelected) {
				continue // Saltar opciones no seleccionadas
			}

			const selectedVariantId = cookedVariants[i] || ing.variantId

			// Variante original (la del estado de compra/crudo)
			const originalVariant =
				ing.variants?.find((v) => v.id === ing.variantId) ||
				ing.variants?.find((v) => v.isDefault) ||
				ing.variants?.[0]

			// Variante seleccionada para consumo
			const selectedVariant = selectedVariantId
				? ing.variants?.find((v) => v.id === selectedVariantId)
				: originalVariant

			if (selectedVariant) {
				// Calcular la cantidad convertida usando los factores de peso
				const originalFactor = originalVariant?.weightFactor || 1
				const selectedFactor = selectedVariant.weightFactor || 1
				const convertedQuantity = (ing.quantity / originalFactor) * selectedFactor

				// Calcular macros con la cantidad convertida
				const factor = convertedQuantity / 100
				calories += (selectedVariant.calories || 0) * factor
				protein += (selectedVariant.protein || 0) * factor
				carbs += (selectedVariant.carbs || 0) * factor
				fat += (selectedVariant.fat || 0) * factor
				fiber += (selectedVariant.fiber || 0) * factor
			}
		}

		return {
			calories: Math.round(calories),
			protein: Math.round(protein * 10) / 10,
			carbs: Math.round(carbs * 10) / 10,
			fat: Math.round(fat * 10) / 10,
			fiber: Math.round(fiber * 10) / 10,
		}
	}, [ingredients, cookedVariants])

	const buildUpdates = (variants: Record<number, number | null>): IngredientUpdate[] => {
		return Object.entries(variants).map(([idx, vid]) => {
			const ing = ingredients[parseInt(idx)]
			return {
				index: parseInt(idx),
				cookedVariantId: vid,
				source: ing?.source || 'direct',
				componentIndex: ing?.componentIndex,
				optionIndex: ing?.optionIndex,
			}
		})
	}

	const handleCookedVariantChange = (index: number, variantId: number | null) => {
		const newCookedVariants = { ...cookedVariants, [index]: variantId }
		setCookedVariants(newCookedVariants)

		onChange({
			ingredientUpdates: buildUpdates(newCookedVariants),
			customMacros: useCustomMacros ? localCustomMacros : {},
		})
	}

	const handleCustomMacroChange = (field: keyof CustomMacros, value: string) => {
		const numValue = value === '' ? null : parseFloat(value)
		const newMacros = { ...localCustomMacros, [field]: numValue }
		setLocalCustomMacros(newMacros)

		onChange({
			ingredientUpdates: buildUpdates(cookedVariants),
			customMacros: useCustomMacros ? newMacros : {},
		})
	}

	const handleToggleCustomMacros = (enabled: boolean) => {
		setUseCustomMacros(enabled)

		const updates = buildUpdates(cookedVariants)

		if (enabled && localCustomMacros.customCalories == null) {
			const prefilledMacros = {
				customCalories: calculatedNutrition.calories,
				customProtein: calculatedNutrition.protein,
				customCarbs: calculatedNutrition.carbs,
				customFat: calculatedNutrition.fat,
				customFiber: calculatedNutrition.fiber,
			}
			setLocalCustomMacros(prefilledMacros)
			onChange({ ingredientUpdates: updates, customMacros: prefilledMacros })
		} else {
			onChange({
				ingredientUpdates: updates,
				customMacros: enabled ? localCustomMacros : {},
			})
		}
	}

	const displayNutrition =
		useCustomMacros && localCustomMacros.customCalories != null
			? {
					calories: localCustomMacros.customCalories || 0,
					protein: localCustomMacros.customProtein || 0,
					carbs: localCustomMacros.customCarbs || 0,
					fat: localCustomMacros.customFat || 0,
					fiber: localCustomMacros.customFiber || 0,
				}
			: calculatedNutrition

	const perServing = {
		calories: Math.round(displayNutrition.calories / servings),
		protein: Math.round((displayNutrition.protein / servings) * 10) / 10,
		carbs: Math.round((displayNutrition.carbs / servings) * 10) / 10,
		fat: Math.round((displayNutrition.fat / servings) * 10) / 10,
		fiber: Math.round((displayNutrition.fiber / servings) * 10) / 10,
	}

	const directIngredients = ingredients.filter((i) => i.source === 'direct')
	const recipeIngredients = ingredients.filter((i) => i.source === 'recipe')
	const componentIngredients = ingredients.filter((i) => i.source === 'component')

	return (
		<div className='nutrition-editor'>
			<div className='nutrition-editor-section'>
				<h4>Ingredientes y recetas incluidas</h4>
				<p className='nutrition-editor-help'>
					Selecciona el estado de cada ingrediente después de cocinar para calcular los macros
					finales.
				</p>

				{ingredients.length === 0 ? (
					<p className='nutrition-editor-empty'>No hay ingredientes en esta receta.</p>
				) : (
					<div className='nutrition-ingredients-list'>
						{/* Ingredientes directos */}
						{directIngredients.length > 0 && (
							<>
								<div className='nutrition-section-title'>Ingredientes directos</div>
								{directIngredients.map((ing) => {
									const idx = ingredients.indexOf(ing)
									const selectedVariantId = cookedVariants[idx] || ing.variantId
									const originalVariant =
										ing.variants?.find((v) => v.id === ing.variantId) ||
										ing.variants?.find((v) => v.isDefault) ||
										ing.variants?.[0]
									const selectedVariant = ing.variants?.find((v) => v.id === selectedVariantId)
									const originalFactor = originalVariant?.weightFactor || 1
									const selectedFactor = selectedVariant?.weightFactor || 1
									const convertedQty = Math.round((ing.quantity / originalFactor) * selectedFactor)
									const showConversion = selectedFactor !== originalFactor

									return (
										<div key={idx} className='nutrition-ingredient-row'>
											<div className='nutrition-ingredient-info'>
												<span className='nutrition-ingredient-icon'>🥬</span>
												<span className='nutrition-ingredient-name'>{ing.name}</span>
												<span className='nutrition-ingredient-qty'>
													{ing.quantity} {ing.unit}
													{showConversion && (
														<span className='nutrition-converted-qty'>
															→ {convertedQty} {ing.unit} {selectedVariant?.name?.toLowerCase()}
														</span>
													)}
												</span>
											</div>
											<div className='nutrition-ingredient-variant'>
												<label>Estado consumo:</label>
												<select
													value={cookedVariants[idx] || ing.variantId || ''}
													onChange={(e) =>
														handleCookedVariantChange(
															idx,
															e.target.value ? parseInt(e.target.value) : null
														)
													}>
													{ing.variants?.map((v) => (
														<option key={v.id} value={v.id}>
															{v.name} {v.calories != null ? `(${v.calories} kcal/100g)` : ''}{' '}
															{v.weightFactor !== 1 ? `×${v.weightFactor}` : ''}
														</option>
													))}
												</select>
											</div>
										</div>
									)
								})}
							</>
						)}

						{/* Recetas incluidas */}
						{recipeIngredients.length > 0 && (
							<>
								<div className='nutrition-section-title'>Recetas incluidas</div>
								{recipeIngredients.map((ing) => {
									const idx = ingredients.indexOf(ing)
									return (
										<div key={idx} className='nutrition-ingredient-row recipe-row'>
											<div className='nutrition-ingredient-info'>
												<span className='nutrition-ingredient-icon'>📖</span>
												<span className='nutrition-ingredient-name'>{ing.name}</span>
												<span className='nutrition-ingredient-qty'>
													{ing.quantity} {ing.unit}
												</span>
											</div>
											<div className='nutrition-ingredient-note'>
												<span>
													Los macros de esta receta se calculan según su propia configuración
												</span>
											</div>
										</div>
									)
								})}
							</>
						)}

						{/* Ingredientes de variantes - agrupados por componente */}
						{componentIngredients.length > 0 &&
							(() => {
								// Agrupar por componentName
								const groups: Record<string, typeof componentIngredients> = {}
								componentIngredients.forEach((ing) => {
									const key = ing.componentName || 'Otros'
									if (!groups[key]) groups[key] = []
									groups[key].push(ing)
								})

								return (
									<>
										<div className='nutrition-section-title'>Ingredientes de variantes</div>
										{Object.entries(groups).map(([compName, options]) => (
											<div key={compName} className='nutrition-component-group'>
												<div className='nutrition-component-header'>{compName}</div>
												<div className='nutrition-component-options'>
													{options.map((ing) => {
														const idx = ingredients.indexOf(ing)
														const selectedVariantId = cookedVariants[idx] || ing.variantId
														const originalVariant =
															ing.variants?.find((v) => v.id === ing.variantId) ||
															ing.variants?.find((v) => v.isDefault) ||
															ing.variants?.[0]
														const selectedVariant = ing.variants?.find(
															(v) => v.id === selectedVariantId
														)
														const originalFactor = originalVariant?.weightFactor || 1
														const selectedFactor = selectedVariant?.weightFactor || 1
														const convertedQty = Math.round(
															(ing.quantity / originalFactor) * selectedFactor
														)
														const showConversion = selectedFactor !== originalFactor

														return (
															<div
																key={idx}
																className={`nutrition-option-row ${ing.isSelected ? 'is-selected' : 'is-unselected'}`}>
																<div className='nutrition-option-radio'>
																	<span
																		className={`radio-indicator ${ing.isSelected ? 'checked' : ''}`}>
																		{ing.isSelected ? '●' : '○'}
																	</span>
																</div>
																<div className='nutrition-ingredient-info'>
																	<span className='nutrition-ingredient-icon'>🥬</span>
																	<span className='nutrition-ingredient-name'>{ing.name}</span>
																	<span className='nutrition-ingredient-qty'>
																		{ing.quantity} {ing.unit}
																		{showConversion && (
																			<span className='nutrition-converted-qty'>
																				→ {convertedQty} {ing.unit}{' '}
																				{selectedVariant?.name?.toLowerCase()}
																			</span>
																		)}
																	</span>
																</div>
																<div className='nutrition-ingredient-variant'>
																	<label>Estado consumo:</label>
																	<select
																		value={cookedVariants[idx] || ing.variantId || ''}
																		onChange={(e) =>
																			handleCookedVariantChange(
																				idx,
																				e.target.value ? parseInt(e.target.value) : null
																			)
																		}>
																		{ing.variants?.map((v) => (
																			<option key={v.id} value={v.id}>
																				{v.name}{' '}
																				{v.calories != null ? `(${v.calories} kcal/100g)` : ''}{' '}
																				{v.weightFactor !== 1 ? `×${v.weightFactor}` : ''}
																			</option>
																		))}
																	</select>
																</div>
															</div>
														)
													})}
												</div>
											</div>
										))}
									</>
								)
							})()}
					</div>
				)}
			</div>

			<div className='nutrition-editor-section'>
				<h4>Macros calculados</h4>
				<div className='nutrition-summary-grid'>
					<div className='nutrition-summary-item'>
						<span className='nutrition-label'>Calorías</span>
						<span className='nutrition-value calories'>{displayNutrition.calories} kcal</span>
						<span className='nutrition-per-serving'>{perServing.calories} kcal/ración</span>
					</div>
					<div className='nutrition-summary-item'>
						<span className='nutrition-label'>Proteína</span>
						<span className='nutrition-value protein'>{displayNutrition.protein}g</span>
						<span className='nutrition-per-serving'>{perServing.protein}g/ración</span>
					</div>
					<div className='nutrition-summary-item'>
						<span className='nutrition-label'>Carbos</span>
						<span className='nutrition-value carbs'>{displayNutrition.carbs}g</span>
						<span className='nutrition-per-serving'>{perServing.carbs}g/ración</span>
					</div>
					<div className='nutrition-summary-item'>
						<span className='nutrition-label'>Grasa</span>
						<span className='nutrition-value fat'>{displayNutrition.fat}g</span>
						<span className='nutrition-per-serving'>{perServing.fat}g/ración</span>
					</div>
					<div className='nutrition-summary-item'>
						<span className='nutrition-label'>Fibra</span>
						<span className='nutrition-value fiber'>{displayNutrition.fiber}g</span>
						<span className='nutrition-per-serving'>{perServing.fiber}g/ración</span>
					</div>
				</div>
			</div>

			<div className='nutrition-editor-section'>
				<label className='nutrition-custom-toggle'>
					<input
						type='checkbox'
						checked={useCustomMacros}
						onChange={(e) => handleToggleCustomMacros(e.target.checked)}
					/>
					Configurar macros manualmente
				</label>

				{useCustomMacros && (
					<div className='nutrition-custom-inputs'>
						<div className='nutrition-input-group'>
							<label>Calorías (total)</label>
							<input
								type='number'
								value={localCustomMacros.customCalories ?? ''}
								onChange={(e) => handleCustomMacroChange('customCalories', e.target.value)}
								placeholder='kcal'
							/>
						</div>
						<div className='nutrition-input-group'>
							<label>Proteína (g)</label>
							<input
								type='number'
								step='0.1'
								value={localCustomMacros.customProtein ?? ''}
								onChange={(e) => handleCustomMacroChange('customProtein', e.target.value)}
								placeholder='g'
							/>
						</div>
						<div className='nutrition-input-group'>
							<label>Carbos (g)</label>
							<input
								type='number'
								step='0.1'
								value={localCustomMacros.customCarbs ?? ''}
								onChange={(e) => handleCustomMacroChange('customCarbs', e.target.value)}
								placeholder='g'
							/>
						</div>
						<div className='nutrition-input-group'>
							<label>Grasa (g)</label>
							<input
								type='number'
								step='0.1'
								value={localCustomMacros.customFat ?? ''}
								onChange={(e) => handleCustomMacroChange('customFat', e.target.value)}
								placeholder='g'
							/>
						</div>
						<div className='nutrition-input-group'>
							<label>Fibra (g)</label>
							<input
								type='number'
								step='0.1'
								value={localCustomMacros.customFiber ?? ''}
								onChange={(e) => handleCustomMacroChange('customFiber', e.target.value)}
								placeholder='g'
							/>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
