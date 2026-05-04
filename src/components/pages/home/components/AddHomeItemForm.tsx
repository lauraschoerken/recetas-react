import './AddHomeItemForm.scss'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { api } from '@/services/api'
import { CreateHomeItemData, HomeLocation } from '@/services/home'
import { Recipe } from '@/services/recipe'
import { Product } from '@/services/product'

interface AddHomeItemFormProps {
	location: HomeLocation
	onSubmit: (data: CreateHomeItemData) => void
	onCancel: () => void
}

type ItemType = 'ingredient' | 'recipe' | 'product'

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
	conversions?: { id: number; unitName: string; gramsPerUnit: number }[]
}

const DEFAULT_UNITS = [
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
	const { t } = useTranslation()
	const [itemType, setItemType] = useState<ItemType>('ingredient')
	const [ingredientName, setIngredientName] = useState('')
	const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null)
	const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
	const [productSearch, setProductSearch] = useState('')
	const [productSuggestions, setProductSuggestions] = useState<Product[]>([])
	const [showProductSuggestions, setShowProductSuggestions] = useState(false)
	const [quantity, setQuantity] = useState(1)
	const [unit, setUnit] = useState('unidad')
	const [expiresAt, setExpiresAt] = useState('')
	const [selectedIngredient, setSelectedIngredient] = useState<IngredientSuggestion | null>(null)
	const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null)

	const [recipes, setRecipes] = useState<Recipe[]>([])
	const [suggestions, setSuggestions] = useState<IngredientSuggestion[]>([])
	const [showSuggestions, setShowSuggestions] = useState(false)
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => {
		if (itemType === 'recipe') {
			api.get<{ data: Recipe[] }>('/recipes?pageSize=1000').then((res) => setRecipes(res.data))
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
			setSuggestions(results.slice(0, 5))
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

	// Construir lista de unidades disponibles según el ingrediente seleccionado
	const getAvailableUnits = (): string[] => {
		if (!selectedIngredient) return DEFAULT_UNITS

		const units = new Set<string>()
		// Unidad base del ingrediente
		units.add(selectedIngredient.unit)
		// Unidades estándar derivadas
		if (selectedIngredient.unit === 'g') {
			units.add('kg')
		} else if (selectedIngredient.unit === 'ml') {
			units.add('l')
		}
		// Conversiones configuradas del ingrediente
		if (selectedIngredient.conversions) {
			for (const conv of selectedIngredient.conversions) {
				units.add(conv.unitName)
			}
		}
		return Array.from(units)
	}

	const searchProducts = async (query: string) => {
		if (query.length < 2) {
			setProductSuggestions([])
			return
		}
		try {
			const results = await api.get<Product[]>(`/products/search?q=${encodeURIComponent(query)}`)
			setProductSuggestions(results.slice(0, 5))
		} catch {
			setProductSuggestions([])
		}
	}

	const handleProductSearchChange = (value: string) => {
		setProductSearch(value)
		if (selectedProduct && value.toLowerCase() !== selectedProduct.name.toLowerCase()) {
			setSelectedProduct(null)
		}
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => searchProducts(value), 300)
	}

	const handleProductClick = (p: Product) => {
		setSelectedProduct(p)
		setProductSearch(p.name.charAt(0).toUpperCase() + p.name.slice(1))
		setProductSuggestions([])
		setShowProductSuggestions(false)
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
		} else if (itemType === 'product' && selectedProduct) {
			data.productId = selectedProduct.id
		} else {
			return
		}

		if (expiresAt) {
			data.expiresAt = expiresAt
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
						{t('homePage.ingredient')}
					</button>
					<button
						type='button'
						className={`item-type-btn ${itemType === 'recipe' ? 'active' : ''}`}
						onClick={() => setItemType('recipe')}>
						{t('homePage.preparedRecipe')}
					</button>
					<button
						type='button'
						className={`item-type-btn ${itemType === 'product' ? 'active' : ''}`}
						onClick={() => setItemType('product')}>
						{t('homePage.productType')}
					</button>
				</div>
			</div>

			{itemType === 'product' && (
				<div className='form-row ingredient-input-row'>
					<div className='ingredient-autocomplete'>
						<input
							type='text'
							className='form-input'
							placeholder={t('products.searchPlaceholder')}
							value={productSearch}
							onChange={(e) => handleProductSearchChange(e.target.value)}
							onFocus={() => setShowProductSuggestions(true)}
							onBlur={() => setTimeout(() => setShowProductSuggestions(false), 200)}
							autoComplete='off'
							required
						/>
						{showProductSuggestions && productSuggestions.length > 0 && (
							<ul className='ingredient-suggestions'>
								{productSuggestions.map((p) => (
									<li
										key={p.id}
										className='ingredient-suggestion-item'
										onMouseDown={() => handleProductClick(p)}>
										<span>{p.name.charAt(0).toUpperCase() + p.name.slice(1)}</span>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
			)}

			{itemType === 'ingredient' ? (
				<>
					<div className='form-row ingredient-input-row'>
						<div className='ingredient-autocomplete'>
							<input
								type='text'
								className='form-input'
								placeholder={t('ingredients.namePlaceholder')}
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
			) : itemType === 'recipe' ? (
				<div className='form-row'>
					<select
						className='form-input'
						value={selectedRecipeId || ''}
						onChange={(e) => setSelectedRecipeId(Number(e.target.value))}
						required>
						<option value=''>{t('homePage.selectRecipe')}</option>
						{recipes.map((r) => (
							<option key={r.id} value={r.id}>
								{r.title}
							</option>
						))}
					</select>
				</div>
			) : null}

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
					{getAvailableUnits().map((u) => (
						<option key={u} value={u}>
							{u}
						</option>
					))}
				</select>
			</div>

			<div className='form-row'>
				<label className='form-label'>
					{t('homePage.expiresOn', { date: '' }).replace(': ', '')}
				</label>
				<input
					type='date'
					className='form-input'
					value={expiresAt}
					onChange={(e) => setExpiresAt(e.target.value)}
				/>
			</div>

			<div className='form-row form-actions'>
				<button type='button' className='btn btn-outline' onClick={onCancel}>
					{t('cancel')}
				</button>
				<button type='submit' className='btn btn-primary'>
					{t('add')}
				</button>
			</div>
		</form>
	)
}
