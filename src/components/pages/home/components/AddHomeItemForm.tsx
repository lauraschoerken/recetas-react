import './AddHomeItemForm.css'

import { useEffect, useRef, useState } from 'react'

import { api } from '@/services/api'
import { CreateHomeItemData, HomeLocation } from '@/services/home'
import { Recipe } from '@/services/recipe'

interface AddHomeItemFormProps {
	location: HomeLocation
	onSubmit: (data: CreateHomeItemData) => void
	onCancel: () => void
}

type ItemType = 'ingredient' | 'recipe'

interface IngredientVariant {
	id: number
	name: string
	isDefault: boolean
	weightFactor: number
}

interface IngredientSuggestion {
	id: number
	name: string
	unit: string
	variants?: IngredientVariant[]
}

const UNITS = [
	'unidad',
	'g',
	'kg',
	'ml',
	'l',
	'porciones',
	'cucharada',
	'cucharadita',
	'taza',
	'pizca',
	'rebanada',
	'trozo',
]

function capitalizeFirst(str: string): string {
	if (!str) return str
	return str.charAt(0).toUpperCase() + str.slice(1)
}

export function AddHomeItemForm({ location, onSubmit, onCancel }: AddHomeItemFormProps) {
	const [itemType, setItemType] = useState<ItemType>('ingredient')
	const [ingredientName, setIngredientName] = useState('')
	const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null)
	const [quantity, setQuantity] = useState(1)
	const [unit, setUnit] = useState('unidad')
	const [selectedIngredient, setSelectedIngredient] = useState<IngredientSuggestion | null>(null)
	const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null)

	const [recipes, setRecipes] = useState<Recipe[]>([])
	const [suggestions, setSuggestions] = useState<IngredientSuggestion[]>([])
	const [showSuggestions, setShowSuggestions] = useState(false)
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => {
		if (itemType === 'recipe') {
			api.get<Recipe[]>('/recipes').then(setRecipes)
			setUnit('porciones')
		} else {
			setUnit('unidad')
		}
	}, [itemType])

	const searchIngredients = async (query: string) => {
		if (query.length < 2) {
			setSuggestions([])
			return
		}
		try {
			const results = await api.get<IngredientSuggestion[]>(
				`/ingredients/search?q=${encodeURIComponent(query)}`
			)
			setSuggestions(results)
		} catch {
			setSuggestions([])
		}
	}

	const handleIngredientChange = (value: string) => {
		const capitalized = capitalizeFirst(value)
		setIngredientName(capitalized)

		// Si cambia el nombre, resetear la selección
		if (selectedIngredient && capitalized.toLowerCase() !== selectedIngredient.name.toLowerCase()) {
			setSelectedIngredient(null)
			setSelectedVariantId(null)
		}

		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => searchIngredients(capitalized), 300)
	}

	const handleSuggestionClick = (suggestion: IngredientSuggestion) => {
		setIngredientName(capitalizeFirst(suggestion.name))
		setUnit(suggestion.unit)
		setSelectedIngredient(suggestion)

		// Seleccionar la variante por defecto
		const defaultVariant = suggestion.variants?.find((v) => v.isDefault) || suggestion.variants?.[0]
		setSelectedVariantId(defaultVariant?.id || null)

		setSuggestions([])
		setShowSuggestions(false)
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		const data: CreateHomeItemData = {
			location,
			quantity,
			unit,
		}

		if (itemType === 'recipe' && selectedRecipeId && selectedRecipeId > 0) {
			data.recipeId = selectedRecipeId
		} else if (itemType === 'ingredient' && ingredientName.trim()) {
			data.ingredientName = ingredientName.trim()
			if (selectedVariantId) {
				data.variantId = selectedVariantId
			}
		} else {
			return
		}

		onSubmit(data)
	}

	return (
		<form className='add-home-item-form' onSubmit={handleSubmit}>
			<div className='form-row'>
				<div className='item-type-selector'>
					<button
						type='button'
						className={`item-type-btn ${itemType === 'ingredient' ? 'active' : ''}`}
						onClick={() => setItemType('ingredient')}>
						Ingrediente
					</button>
					<button
						type='button'
						className={`item-type-btn ${itemType === 'recipe' ? 'active' : ''}`}
						onClick={() => setItemType('recipe')}>
						Receta preparada
					</button>
				</div>
			</div>

			{itemType === 'ingredient' ? (
				<>
					<div className='form-row ingredient-input-row'>
						<div className='ingredient-autocomplete'>
							<input
								type='text'
								className='form-input'
								placeholder='Nombre del ingrediente'
								value={ingredientName}
								onChange={(e) => handleIngredientChange(e.target.value)}
								onFocus={() => setShowSuggestions(true)}
								onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
								autoComplete='off'
								required
							/>
							{showSuggestions && suggestions.length > 0 && (
								<ul className='ingredient-suggestions'>
									{suggestions.map((s) => (
										<li
											key={s.id}
											className='ingredient-suggestion-item'
											onMouseDown={() => handleSuggestionClick(s)}>
											<span>{capitalizeFirst(s.name)}</span>
											<span className='suggestion-unit'>{s.unit}</span>
										</li>
									))}
								</ul>
							)}
						</div>
					</div>
					{selectedIngredient?.variants && selectedIngredient.variants.length > 1 && (
						<div className='form-row variant-row'>
							<label className='variant-label'>Estado:</label>
							<select
								className='form-input variant-select'
								value={selectedVariantId || ''}
								onChange={(e) => setSelectedVariantId(Number(e.target.value))}>
								{selectedIngredient.variants.map((v) => (
									<option key={v.id} value={v.id}>
										{v.name}
									</option>
								))}
							</select>
						</div>
					)}
				</>
			) : (
				<div className='form-row'>
					<select
						className='form-input'
						value={selectedRecipeId || ''}
						onChange={(e) => setSelectedRecipeId(Number(e.target.value))}
						required>
						<option value=''>Selecciona una receta</option>
						{recipes.map((r) => (
							<option key={r.id} value={r.id}>
								{r.title}
							</option>
						))}
					</select>
				</div>
			)}

			<div className='form-row quantity-row'>
				<input
					type='number'
					className='form-input qty-input'
					value={quantity}
					onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
					min={0}
					step={0.1}
					required
				/>
				<select
					className='form-input unit-select'
					value={unit}
					onChange={(e) => setUnit(e.target.value)}>
					{UNITS.map((u) => (
						<option key={u} value={u}>
							{u}
						</option>
					))}
				</select>
			</div>

			<div className='form-row form-actions'>
				<button type='button' className='btn btn-outline' onClick={onCancel}>
					Cancelar
				</button>
				<button type='submit' className='btn btn-primary'>
					Añadir
				</button>
			</div>
		</form>
	)
}
