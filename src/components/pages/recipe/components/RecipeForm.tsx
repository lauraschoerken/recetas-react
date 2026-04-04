import './RecipeForm.scss'

import { useMemo, useState } from 'react'

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
	const [activeTab, setActiveTab] = useState<TabId>('recipe')
	const [title, setTitle] = useState(initialData?.title || '')
	const [description, setDescription] = useState(initialData?.description || '')
	const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '')
	const [steps, setSteps] = useState<string[]>(
		initialData?.instructions ? initialData.instructions.split('\n').filter((s) => s.trim()) : []
	)
	const [servings, setServings] = useState(initialData?.servings || 4)
	const [isPublic, setIsPublic] = useState(initialData?.isPublic || false)

	// Macros manuales
	const [customMacros, setCustomMacros] = useState<CustomMacrosState>({
		customCalories: initialData?.customCalories,
		customProtein: initialData?.customProtein,
		customCarbs: initialData?.customCarbs,
		customFat: initialData?.customFat,
		customFiber: initialData?.customFiber,
	})

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
				baseUnit: i.unit as 'g' | 'ml' | undefined,
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
			servings,
			isPublic,
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

	// Usar los macros del backend si están disponibles, si no calcular de ingredientes
	const displayNutrition =
		initialData?.nutritionPerServing ||
		(nutritionSummary.hasData
			? {
					calories: Math.round(nutritionSummary.calories / servings),
					protein: Math.round((nutritionSummary.protein / servings) * 10) / 10,
					carbs: Math.round((nutritionSummary.carbs / servings) * 10) / 10,
					fat: Math.round((nutritionSummary.fat / servings) * 10) / 10,
					fiber: Math.round((nutritionSummary.fiber / servings) * 10) / 10,
				}
			: null)

	const totalNutrition =
		initialData?.nutrition ||
		(nutritionSummary.hasData
			? {
					calories: nutritionSummary.calories,
					protein: nutritionSummary.protein,
					carbs: nutritionSummary.carbs,
					fat: nutritionSummary.fat,
					fiber: nutritionSummary.fiber,
				}
			: null)

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
					<label className='form-label'>Título *</label>
					<input
						type='text'
						className='form-input'
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder='Ej: Tortilla de patatas, Pasta carbonara...'
						required
					/>
				</div>

				<div className='form-group'>
					<label className='form-label'>Descripción</label>
					<textarea
						className='form-input form-textarea'
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder='Una breve descripción de tu receta...'
						rows={3}
					/>
				</div>

				<div className='form-group'>
					<label className='form-label'>URL de imagen</label>
					<div className='image-url-input'>
						<input
							type='url'
							className='form-input'
							value={imageUrl}
							onChange={(e) => setImageUrl(e.target.value)}
							placeholder='https://ejemplo.com/imagen-receta.jpg'
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
						<label className='form-label'>Porciones</label>
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
						<label className='form-label'>Visibilidad</label>
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
								{isPublic
									? 'Pública - Todos podrán ver esta receta'
									: 'Privada - Solo tú podrás verla'}
							</span>
						</div>
					</div>
				</div>
			</div>

			<div className='form-tabs'>
				<button
					type='button'
					className={`form-tab ${activeTab === 'recipe' ? 'active' : ''}`}
					onClick={() => setActiveTab('recipe')}>
					Ingredientes
				</button>
				<button
					type='button'
					className={`form-tab ${activeTab === 'nutrition' ? 'active' : ''}`}
					onClick={() => setActiveTab('nutrition')}>
					Nutrición
				</button>
			</div>

			{activeTab === 'recipe' && (
				<>
					<div className='form-section'>
						<label className='form-label'>Ingredientes directos</label>
						<p className='form-hint'>Ingredientes que se usan directamente</p>
						<IngredientsList ingredients={ingredients} onChange={setIngredients} />
					</div>

					<div className='form-section'>
						<label className='form-label'>Recetas incluidas</label>
						<p className='form-hint'>
							Otras recetas que se usan en esta (ej: caldo casero, salsa base...)
						</p>
						<IncludedRecipes recipes={includedRecipes} onChange={setIncludedRecipes} />
					</div>

					<div className='form-section'>
						<label className='form-label'>Variantes opcionales</label>
						<p className='form-hint'>
							Partes de la receta que pueden tener diferentes opciones (ej: arroz basmati o redondo)
						</p>
						<ComponentsEditor components={components} onChange={setComponents} />
					</div>

					<div className='form-section'>
						<label className='form-label'>Pasos</label>
						<StepsList steps={steps} onChange={setSteps} />
					</div>

					{displayNutrition && (
						<div className='form-section nutrition-summary'>
							<label className='form-label'>Información nutricional (vista rápida)</label>
							<div className='nutrition-grid'>
								<div className='nutrition-item calories'>
									<span className='nutrition-value'>{displayNutrition.calories}</span>
									<span className='nutrition-label'>kcal/ración</span>
								</div>
								<div className='nutrition-item protein'>
									<span className='nutrition-value'>{displayNutrition.protein}g</span>
									<span className='nutrition-label'>Proteína</span>
								</div>
								<div className='nutrition-item carbs'>
									<span className='nutrition-value'>{displayNutrition.carbs}g</span>
									<span className='nutrition-label'>Carbos</span>
								</div>
								<div className='nutrition-item fat'>
									<span className='nutrition-value'>{displayNutrition.fat}g</span>
									<span className='nutrition-label'>Grasa</span>
								</div>
								<div className='nutrition-item fiber'>
									<span className='nutrition-value'>{displayNutrition.fiber}g</span>
									<span className='nutrition-label'>Fibra</span>
								</div>
							</div>
							{totalNutrition && servings > 1 && (
								<div
									className='nutrition-per-serving'
									style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
									Total ({servings} porciones): {totalNutrition.calories} kcal
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
					Cancelar
				</button>
				<button type='submit' className='btn btn-primary' disabled={loading}>
					{loading ? 'Guardando...' : initialData ? 'Guardar cambios' : 'Crear receta'}
				</button>
			</div>
		</form>
	)
}
