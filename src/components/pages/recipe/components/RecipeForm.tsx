import './RecipeForm.scss'

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { IngredientItem, IngredientsList } from '@/components/shared/ingredients-list'
import { StepsList } from '@/components/shared/steps-list'
import { CreateComponentData, CreateRecipeData, Recipe } from '@/services/recipe'

import { ComponentsEditor } from './features/ComponentsEditor'
import { IncludedRecipe, IncludedRecipes } from './features/IncludedRecipes'
import { NutritionEditor } from './features/NutritionEditor'

type TabId = 'recipe' | 'nutrition'

interface NutritionSummary {
	calories: number
	protein: number
	carbs: number
	fat: number
	fiber: number
	hasData: boolean
}

interface CustomMacrosState {
	customCalories?: number | null
	customProtein?: number | null
	customCarbs?: number | null
	customFat?: number | null
	customFiber?: number | null
}

const getQuantityFactor = (unit: string, quantity: number): number => {
	const u = unit.toLowerCase()
	if (u === 'g' || u === 'ml') {
		return quantity / 100
	}
	if (u === 'kg' || u === 'l') {
		return (quantity * 1000) / 100
	}
	return quantity
}

function capitalizeFirst(str: string): string {
	if (!str) return str
	return str.charAt(0).toUpperCase() + str.slice(1)
}

interface RecipeFormProps {
	initialData?: Recipe
	onSubmit: (data: CreateRecipeData) => void
	onCancel: () => void
	loading: boolean
	error: string | null
}

export function RecipeForm({ initialData, onSubmit, onCancel, loading, error }: RecipeFormProps) {
	const { t } = useTranslation()
	const [activeTab, setActiveTab] = useState<TabId>('recipe')
	const [title, setTitle] = useState(initialData?.title || '')
	const [description, setDescription] = useState(initialData?.description || '')
	const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '')
	const [cookTimeMinutes, setCookTimeMinutes] = useState(initialData?.cookTimeMinutes || 0)
	const [difficulty, setDifficulty] = useState(initialData?.difficulty || '')
	const [steps, setSteps] = useState<string[]>(
		initialData?.instructions ? initialData.instructions.split('\n').filter((s) => s.trim()) : []
	)
	const [servings, setServings] = useState(initialData?.servings || 4)
	const [isPublic, setIsPublic] = useState(initialData?.isPublic || false)
	const [defaultLocation, setDefaultLocation] = useState(initialData?.defaultLocation || '')

	// Macros manuales
	const [customMacros, setCustomMacros] = useState<CustomMacrosState>({
		customCalories: initialData?.customCalories,
		customProtein: initialData?.customProtein,
		customCarbs: initialData?.customCarbs,
		customFat: initialData?.customFat,
		customFiber: initialData?.customFiber,
	})

	// Macros calculados en tiempo real por el NutritionEditor (cooked states)
	const [liveNutrition, setLiveNutrition] = useState<{
		calories: number
		protein: number
		carbs: number
		fat: number
		fiber: number
	} | null>(null)

	const [ingredients, setIngredients] = useState<IngredientItem[]>(
		initialData?.ingredients.map((i, idx) => {
			const variant =
				i.variants?.find((v) => v.id === i.variantId) ||
				i.variants?.find((v) => v.isDefault) ||
				i.variants?.[0]
			return {
				id: `ing-${idx}`,
				name: capitalizeFirst(i.name),
				quantity: i.quantity ?? 0,
				unit: i.unit,
				isFromDatabase: true,
				databaseId: i.id,
				baseUnit: (i.ingredientBaseUnit || i.unit) as 'g' | 'ml' | undefined,
				conversions: i.conversions,
				variants: i.variants,
				variantId: i.variantId || variant?.id,
				variantName: i.variantName || variant?.name,
				cookedVariantId: i.cookedVariantId,
				cookedVariantName: i.cookedVariantName,
				calories: variant?.calories,
				protein: variant?.protein,
				carbs: variant?.carbs,
				fat: variant?.fat,
				fiber: variant?.fiber,
			}
		}) || []
	)

	// Separar componentes con una sola opción de receta (recetas directas) de los que tienen variantes
	const [includedRecipes, setIncludedRecipes] = useState<IncludedRecipe[]>(() => {
		if (!initialData?.components) return []

		// Receta incluida = 1 opción con recipeId/recipe y NO opcional
		return initialData.components
			.filter((c) => {
				const hasOneOption = c.options.length === 1
				const firstOption = c.options[0]
				const hasRecipeId = firstOption?.recipeId != null || firstOption?.recipe != null
				const isNotOptional = c.isOptional !== true
				return hasOneOption && hasRecipeId && isNotOptional
			})
			.map((c, idx) => ({
				id: `inc-${idx}`,
				recipeId: c.options[0].recipeId || c.options[0].recipe?.id || null,
				recipeName: capitalizeFirst(c.options[0].recipe?.title || c.name),
				servings: c.options[0].recipeServings || 1,
			}))
	})

	const [components, setComponents] = useState<CreateComponentData[]>(() => {
		if (!initialData?.components) return []
		// Variantes = más de una opción, O es opcional, O no tiene recipeId
		return initialData.components
			.filter((c) => {
				const hasOneOption = c.options.length === 1
				const firstOption = c.options[0]
				const hasRecipeId = firstOption?.recipeId != null || firstOption?.recipe != null
				const isNotOptional = c.isOptional !== true
				// Excluir los que son recetas incluidas (1 opción + recipeId + no opcional)
				const isIncludedRecipe = hasOneOption && hasRecipeId && isNotOptional
				return !isIncludedRecipe
			})
			.map((c) => ({
				name: capitalizeFirst(c.name),
				sortOrder: c.sortOrder,
				isOptional: c.isOptional,
				defaultEnabled: c.defaultEnabled,
				options: c.options.map((o) => {
					if (o.recipeId) {
						return {
							name: capitalizeFirst(o.name),
							isDefault: o.isDefault,
							recipeId: o.recipeId,
							recipeServings: o.recipeServings || 1,
						}
					} else {
						return {
							name: capitalizeFirst(o.name),
							isDefault: o.isDefault,
							ingredientName: capitalizeFirst(o.ingredient?.name || ''),
							ingredientId: o.ingredient?.id,
							ingredientVariants: o.ingredient?.variants,
							ingredientConversions: o.ingredient?.conversions,
							cookedVariantId: o.ingredient?.cookedVariantId,
							quantity: o.quantity || undefined,
							unit: o.unit || 'g',
						}
					}
				}),
			}))
	})

	// Los macros ya vienen calculados del backend en initialData.nutrition
	// No necesitamos buscar ingredientes al cargar

	const nutritionSummary = useMemo<NutritionSummary>(() => {
		let calories = 0,
			protein = 0,
			carbs = 0,
			fat = 0,
			fiber = 0
		let hasData = false

		for (const ing of ingredients) {
			const hasNutrition =
				ing.calories != null ||
				ing.protein != null ||
				ing.carbs != null ||
				ing.fat != null ||
				ing.fiber != null

			if (hasNutrition) {
				hasData = true
				const factor = getQuantityFactor(ing.unit, ing.quantity)
				calories += (ing.calories || 0) * factor
				protein += (ing.protein || 0) * factor
				carbs += (ing.carbs || 0) * factor
				fat += (ing.fat || 0) * factor
				fiber += (ing.fiber || 0) * factor
			}
		}

		return {
			calories: Math.round(calories),
			protein: Math.round(protein * 10) / 10,
			carbs: Math.round(carbs * 10) / 10,
			fat: Math.round(fat * 10) / 10,
			fiber: Math.round(fiber * 10) / 10,
			hasData,
		}
	}, [ingredients])

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		const validIngredients = ingredients.filter((i) => i.name.trim() !== '')

		// Convertir recetas incluidas a componentes (con una sola opción)
		const includedAsComponents: CreateComponentData[] = includedRecipes
			.filter((r) => r.recipeId)
			.map((r, idx) => ({
				name: r.recipeName,
				sortOrder: idx,
				isOptional: false,
				options: [
					{
						name: r.recipeName,
						isDefault: true,
						recipeId: r.recipeId!,
						recipeServings: r.servings,
					},
				],
			}))

		// Componentes con variantes
		const validComponents = components.filter((c) => c.name.trim() !== '' && c.options.length > 0)

		// Combinar todos los componentes
		const allComponents = [...includedAsComponents, ...validComponents]

		if (validIngredients.length === 0 && allComponents.length === 0) {
			return
		}

		onSubmit({
			title,
			description: description || undefined,
			instructions: steps.length > 0 ? steps.join('\n') : undefined,
			imageUrl: imageUrl || undefined,
			cookTimeMinutes: cookTimeMinutes > 0 ? cookTimeMinutes : undefined,
			difficulty: difficulty || undefined,
			servings,
			isPublic,
			defaultLocation: defaultLocation || undefined,
			ingredients:
				validIngredients.length > 0
					? validIngredients.map((i) => ({
							name: i.name,
							quantity: i.quantity,
							unit: i.unit,
							variantId: i.variantId || undefined,
							cookedVariantId: i.cookedVariantId || undefined,
						}))
					: undefined,
			components: allComponents.length > 0 ? allComponents : undefined,
			// Macros manuales
			customCalories: customMacros.customCalories,
			customProtein: customMacros.customProtein,
			customCarbs: customMacros.customCarbs,
			customFat: customMacros.customFat,
			customFiber: customMacros.customFiber,
		})
	}

	// Prioridad: 1) customMacros manuales activos, 2) liveNutrition del NutritionEditor, 3) nutritionPerServing del backend, 4) calculado de ingredientes
	const displayNutrition = useMemo(() => {
		if (customMacros.customCalories != null) {
			return {
				calories: Math.round((customMacros.customCalories || 0) / servings),
				protein: Math.round(((customMacros.customProtein || 0) / servings) * 10) / 10,
				carbs: Math.round(((customMacros.customCarbs || 0) / servings) * 10) / 10,
				fat: Math.round(((customMacros.customFat || 0) / servings) * 10) / 10,
				fiber: Math.round(((customMacros.customFiber || 0) / servings) * 10) / 10,
			}
		}
		if (liveNutrition) {
			return {
				calories: Math.round(liveNutrition.calories / servings),
				protein: Math.round((liveNutrition.protein / servings) * 10) / 10,
				carbs: Math.round((liveNutrition.carbs / servings) * 10) / 10,
				fat: Math.round((liveNutrition.fat / servings) * 10) / 10,
				fiber: Math.round((liveNutrition.fiber / servings) * 10) / 10,
			}
		}
		if (initialData?.nutritionPerServing) {
			return initialData.nutritionPerServing
		}
		if (nutritionSummary.hasData) {
			return {
				calories: Math.round(nutritionSummary.calories / servings),
				protein: Math.round((nutritionSummary.protein / servings) * 10) / 10,
				carbs: Math.round((nutritionSummary.carbs / servings) * 10) / 10,
				fat: Math.round((nutritionSummary.fat / servings) * 10) / 10,
				fiber: Math.round((nutritionSummary.fiber / servings) * 10) / 10,
			}
		}
		return null
	}, [customMacros, liveNutrition, initialData, nutritionSummary, servings])

	const totalNutrition = useMemo(() => {
		if (customMacros.customCalories != null) {
			return {
				calories: customMacros.customCalories || 0,
				protein: customMacros.customProtein || 0,
				carbs: customMacros.customCarbs || 0,
				fat: customMacros.customFat || 0,
				fiber: customMacros.customFiber || 0,
			}
		}
		if (liveNutrition) {
			return liveNutrition
		}
		if (initialData?.nutrition) {
			return initialData.nutrition
		}
		if (nutritionSummary.hasData) {
			return {
				calories: nutritionSummary.calories,
				protein: nutritionSummary.protein,
				carbs: nutritionSummary.carbs,
				fat: nutritionSummary.fat,
				fiber: nutritionSummary.fiber,
			}
		}
		return null
	}, [customMacros, liveNutrition, initialData, nutritionSummary])

	// Preparar ingredientes y recetas para NutritionEditor
	const nutritionIngredients = useMemo(() => {
		const result: Array<{
			id: number
			name: string
			quantity: number
			unit: string
			variantId?: number | null
			variantName?: string
			cookedVariantId?: number | null
			cookedVariantName?: string
			variants?: (typeof ingredients)[0]['variants']
			baseUnit?: string
			conversions?: (typeof ingredients)[0]['conversions']
			source: 'direct' | 'component' | 'recipe'
			componentName?: string
			componentIndex?: number
			optionIndex?: number
			isRecipe?: boolean
			servings?: number
			isSelected?: boolean
		}> = []

		// Ingredientes directos
		ingredients.forEach((ing, idx) => {
			if (ing.name && ing.variants && ing.variants.length > 0) {
				result.push({
					id: ing.databaseId || idx,
					name: ing.name,
					quantity: ing.quantity,
					unit: ing.unit,
					variantId: ing.variantId,
					variantName: ing.variantName,
					cookedVariantId: ing.cookedVariantId,
					cookedVariantName: ing.cookedVariantName,
					variants: ing.variants,
					baseUnit: ing.baseUnit,
					conversions: ing.conversions,
					source: 'direct',
				})
			}
		})

		// Recetas incluidas
		includedRecipes.forEach((recipe, idx) => {
			if (recipe.recipeId && recipe.recipeName) {
				result.push({
					id: recipe.recipeId,
					name: recipe.recipeName,
					quantity: recipe.servings,
					unit: 'raciones',
					source: 'recipe',
					isRecipe: true,
					servings: recipe.servings,
				})
			}
		})

		// Ingredientes de componentes/variantes - todas las opciones, marcando la seleccionada
		components.forEach((comp, compIdx) => {
			comp.options.forEach((opt, optIdx) => {
				if (opt.ingredientName && opt.ingredientVariants && opt.ingredientVariants.length > 0) {
					result.push({
						id: opt.ingredientId || 1000 + compIdx * 100 + optIdx,
						name: opt.ingredientName,
						quantity: opt.quantity || 100,
						unit: opt.unit || 'g',
						variantId: undefined,
						variantName: undefined,
						cookedVariantId: opt.cookedVariantId,
						cookedVariantName: undefined,
						variants: opt.ingredientVariants,
						conversions: opt.ingredientConversions,
						source: 'component',
						componentName: comp.name,
						componentIndex: compIdx,
						optionIndex: optIdx,
						isSelected: opt.isDefault || false,
					})
				}
			})
		})

		return result
	}, [ingredients, includedRecipes, components])

	const handleNutritionChange = (data: {
		ingredientUpdates: {
			index: number
			cookedVariantId: number | null
			source: 'direct' | 'component' | 'recipe'
			componentIndex?: number
			optionIndex?: number
		}[]
		customMacros: {
			customCalories?: number | null
			customProtein?: number | null
			customCarbs?: number | null
			customFat?: number | null
			customFiber?: number | null
		}
		calculatedNutrition?: {
			calories: number
			protein: number
			carbs: number
			fat: number
			fiber: number
		}
	}) => {
		const newIngredients = [...ingredients]
		const newComponents = [...components]

		// Contar ingredientes directos válidos para mapear el índice
		const validDirectIngredients = ingredients
			.map((ing, idx) => ({ ing, idx }))
			.filter(({ ing }) => ing.name && ing.variants && ing.variants.length > 0)

		for (const update of data.ingredientUpdates) {
			if (update.source === 'direct') {
				// Buscar el ingrediente directo por su posición en la lista filtrada
				const directItem = validDirectIngredients[update.index]
				if (directItem) {
					newIngredients[directItem.idx] = {
						...newIngredients[directItem.idx],
						cookedVariantId: update.cookedVariantId,
					}
				}
			} else if (
				update.source === 'component' &&
				update.componentIndex != null &&
				update.optionIndex != null
			) {
				// Actualizar la opción del componente
				if (newComponents[update.componentIndex]?.options[update.optionIndex]) {
					newComponents[update.componentIndex] = {
						...newComponents[update.componentIndex],
						options: newComponents[update.componentIndex].options.map((opt, i) =>
							i === update.optionIndex
								? { ...opt, cookedVariantId: update.cookedVariantId || undefined }
								: opt
						),
					}
				}
			}
		}

		setIngredients(newIngredients)
		setComponents(newComponents)
		setCustomMacros(data.customMacros)
		if (data.calculatedNutrition) {
			setLiveNutrition(data.calculatedNutrition)
		}
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
			const target = e.target as HTMLElement
			if (target.tagName !== 'BUTTON' || !target.classList.contains('btn-primary')) {
				e.preventDefault()
			}
		}
	}

	return (
		<form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className='recipe-form'>
			{error && (
				<div
					className='error-message'
					style={{
						marginBottom: '1rem',
						padding: '1rem',
						background: 'var(--danger-light)',
						borderRadius: 'var(--radius-sm)',
					}}>
					{error}
				</div>
			)}

			<div className='form-section'>
				<div className='form-group'>
					<label className='form-label'>{t('recipes.titleLabel')}</label>
					<input
						type='text'
						className='form-input'
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder={t('recipes.titlePlaceholder')}
						required
					/>
				</div>

				<div className='form-group'>
					<label className='form-label'>{t('recipes.descriptionLabel')}</label>
					<textarea
						className='form-input form-textarea'
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder={t('recipes.descriptionPlaceholder')}
						rows={3}
					/>
				</div>

				<div className='form-group'>
					<label className='form-label'>{t('recipes.imageUrlLabel')}</label>
					<div className='image-url-input'>
						<input
							type='url'
							className='form-input'
							value={imageUrl}
							onChange={(e) => setImageUrl(e.target.value)}
							placeholder={t('recipes.imagePlaceholder')}
						/>
						{imageUrl && (
							<div className='image-preview'>
								<img
									src={imageUrl}
									alt='Preview'
									onError={(e) => (e.currentTarget.style.display = 'none')}
								/>
							</div>
						)}
					</div>
				</div>
			</div>

			<div className='form-section'>
				<div className='form-grid-2'>
					<div className='form-group'>
						<label className='form-label'>{t('recipes.servingsLabel')}</label>
						<input
							type='number'
							className='form-input'
							value={servings}
							onChange={(e) => setServings(parseInt(e.target.value) || 1)}
							min={1}
							max={100}
							style={{ width: '100px' }}
						/>
					</div>

					<div className='form-group'>
						<label className='form-label'>{t('recipes.timeLabel')}</label>
						<input
							type='number'
							className='form-input'
							value={cookTimeMinutes || ''}
							onChange={(e) => setCookTimeMinutes(parseInt(e.target.value) || 0)}
							min={0}
							placeholder={t('recipes.timePlaceholder')}
						/>
					</div>

					<div className='form-group'>
						<label className='form-label'>{t('recipes.difficultyLabel')}</label>
						<select
							className='form-input'
							value={difficulty}
							onChange={(e) => setDifficulty(e.target.value)}>
							<option value=''>{t('recipes.difficultySelect')}</option>
							<option value='easy'>{t('recipes.difficultyEasy')}</option>
							<option value='medium'>{t('recipes.difficultyMedium')}</option>
							<option value='hard'>{t('recipes.difficultyHard')}</option>
						</select>
					</div>

					<div className='form-group'>
						<label className='form-label'>{t('recipes.visibilityLabel')}</label>
						<div className={`visibility-box ${isPublic ? 'is-public' : 'is-private'}`}>
							<label className='toggle-container'>
								<input
									type='checkbox'
									checked={isPublic}
									onChange={(e) => setIsPublic(e.target.checked)}
								/>
								<span className='toggle-slider'></span>
							</label>
							<span className='visibility-hint'>
								{isPublic ? t('recipes.publicHint') : t('recipes.privateHint')}
							</span>
						</div>
					</div>

					<div className='form-group'>
						<label className='form-label'>{t('recipes.saveInLabel')}</label>
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
				</div>
			</div>

			<div className='form-tabs'>
				<button
					type='button'
					className={`form-tab ${activeTab === 'recipe' ? 'active' : ''}`}
					onClick={() => setActiveTab('recipe')}>
					{t('recipes.ingredientsTab')}
				</button>
				<button
					type='button'
					className={`form-tab ${activeTab === 'nutrition' ? 'active' : ''}`}
					onClick={() => setActiveTab('nutrition')}>
					{t('recipes.nutritionTab')}
				</button>
			</div>

			{activeTab === 'recipe' && (
				<>
					<div className='form-section'>
						<label className='form-label'>{t('recipes.directIngredients')}</label>
						<p className='form-hint'>{t('recipes.directIngredientsHint')}</p>
						<IngredientsList ingredients={ingredients} onChange={setIngredients} />
					</div>

					<div className='form-section'>
						<label className='form-label'>{t('recipes.includedRecipes')}</label>
						<p className='form-hint'>{t('recipes.includedRecipesHint')}</p>
						<IncludedRecipes recipes={includedRecipes} onChange={setIncludedRecipes} />
					</div>

					<div className='form-section'>
						<label className='form-label'>{t('recipes.optionalVariants')}</label>
						<p className='form-hint'>{t('recipes.optionalVariantsHint')}</p>
						<ComponentsEditor
							components={components}
							onChange={setComponents}
							currentRecipeId={initialData?.id}
						/>
					</div>

					<div className='form-section'>
						<label className='form-label'>{t('recipes.stepsLabel')}</label>
						<StepsList steps={steps} onChange={setSteps} />
					</div>

					{displayNutrition && (
						<div className='form-section nutrition-summary'>
							<label className='form-label'>{t('recipes.nutritionPreview')}</label>
							<div className='nutrition-grid'>
								<div className='nutrition-item calories'>
									<span className='nutrition-value'>{displayNutrition.calories}</span>
									<span className='nutrition-label'>{t('recipes.kcalPerRation')}</span>
								</div>
								<div className='nutrition-item protein'>
									<span className='nutrition-value'>{displayNutrition.protein}g</span>
									<span className='nutrition-label'>{t('weekPlan.protein')}</span>
								</div>
								<div className='nutrition-item carbs'>
									<span className='nutrition-value'>{displayNutrition.carbs}g</span>
									<span className='nutrition-label'>{t('weekPlan.carbs')}</span>
								</div>
								<div className='nutrition-item fat'>
									<span className='nutrition-value'>{displayNutrition.fat}g</span>
									<span className='nutrition-label'>{t('weekPlan.fat')}</span>
								</div>
								<div className='nutrition-item fiber'>
									<span className='nutrition-value'>{displayNutrition.fiber}g</span>
									<span className='nutrition-label'>{t('fiber')}</span>
								</div>
							</div>
							{totalNutrition && servings > 1 && (
								<div
									className='nutrition-per-serving'
									style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
									{t('recipes.totalCalories', {
										servings,
										calories: totalNutrition.calories,
									})}
								</div>
							)}
						</div>
					)}
				</>
			)}

			{activeTab === 'nutrition' && (
				<div className='form-section'>
					<NutritionEditor
						ingredients={nutritionIngredients}
						customMacros={customMacros}
						servings={servings}
						onChange={handleNutritionChange}
					/>
				</div>
			)}

			<div className='form-actions'>
				<button type='button' className='btn btn-outline' onClick={onCancel}>
					{t('cancel')}
				</button>
				<button type='submit' className='btn btn-primary' disabled={loading}>
					{loading
						? t('recipes.saving')
						: initialData
							? t('recipes.saveChanges')
							: t('recipes.createRecipe')}
				</button>
			</div>
		</form>
	)
}
