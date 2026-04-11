import './IngredientsList.scss'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ChartIcon, CloseIcon, ScaleIcon } from '@/components/shared/icons'
import {
	IngredientStatesPanel,
	IngredientVariant,
} from '@/components/shared/ingredient-states-panel'
import { api } from '@/services/api'

interface UnitConversion {
	id: number
	unitName: string
	gramsPerUnit: number
}

export interface IngredientItem {
	id: string
	name: string
	quantity: number
	unit: string
	variantId?: number | null
	variantName?: string
	cookedVariantId?: number | null
	cookedVariantName?: string
	calories?: number | null
	protein?: number | null
	carbs?: number | null
	fat?: number | null
	fiber?: number | null
	isFromDatabase?: boolean
	databaseId?: number
	baseUnit?: 'g' | 'ml'
	conversions?: UnitConversion[]
	variants?: IngredientVariant[]
}

interface Suggestion {
	id: number
	name: string
	unit: 'g' | 'ml'
	conversions?: UnitConversion[]
	variants?: IngredientVariant[]
}

interface IngredientsListProps {
	ingredients: IngredientItem[]
	onChange: (ingredients: IngredientItem[]) => void
}

const BASE_UNITS: ('g' | 'ml')[] = ['g', 'ml']

function capitalizeFirst(str: string): string {
	if (!str) return str
	return str.charAt(0).toUpperCase() + str.slice(1)
}

export function IngredientsList({ ingredients, onChange }: IngredientsListProps) {
	const { t } = useTranslation()
	const [suggestions, setSuggestions] = useState<Record<string, Suggestion[]>>({})
	const [activeInputId, setActiveInputId] = useState<string | null>(null)
	const [showNewUnitModal, setShowNewUnitModal] = useState<string | null>(null)
	const [showMacrosId, setShowMacrosId] = useState<string | null>(null)
	const [showConversionsId, setShowConversionsId] = useState<string | null>(null)
	const [newUnitName, setNewUnitName] = useState('')
	const [newUnitGrams, setNewUnitGrams] = useState('')
	const debounceRef = useRef<Record<string, NodeJS.Timeout>>({})

	const searchIngredients = async (query: string, inputId: string) => {
		if (query.length < 2) {
			setSuggestions((prev) => ({ ...prev, [inputId]: [] }))
			return
		}

		try {
			const results = await api.get<Suggestion[]>(
				`/ingredients/search?q=${encodeURIComponent(query)}`
			)
			setSuggestions((prev) => ({ ...prev, [inputId]: results }))
		} catch {
			setSuggestions((prev) => ({ ...prev, [inputId]: [] }))
		}
	}

	const handleNameChange = (id: string, value: string) => {
		const capitalizedValue = capitalizeFirst(value)

		onChange(
			ingredients.map((ing) =>
				ing.id === id
					? {
							...ing,
							name: capitalizedValue,
							isFromDatabase: false,
							conversions: undefined,
							baseUnit: undefined,
							variants: undefined,
							variantId: undefined,
							variantName: undefined,
						}
					: ing
			)
		)

		if (debounceRef.current[id]) {
			clearTimeout(debounceRef.current[id])
		}

		debounceRef.current[id] = setTimeout(() => {
			searchIngredients(capitalizedValue, id)
		}, 300)
	}

	const handleSuggestionClick = (ingredientId: string, suggestion: Suggestion) => {
		const defaultVariant = suggestion.variants?.find((v) => v.isDefault) || suggestion.variants?.[0]

		onChange(
			ingredients.map((ing) =>
				ing.id === ingredientId
					? {
							...ing,
							name: capitalizeFirst(suggestion.name),
							unit: suggestion.unit,
							baseUnit: suggestion.unit,
							isFromDatabase: true,
							databaseId: suggestion.id,
							conversions: suggestion.conversions,
							variants: suggestion.variants,
							variantId: defaultVariant?.id || null,
							variantName: defaultVariant?.name || undefined,
							calories: defaultVariant?.calories,
							protein: defaultVariant?.protein,
							carbs: defaultVariant?.carbs,
							fat: defaultVariant?.fat,
							fiber: defaultVariant?.fiber,
						}
					: ing
			)
		)
		setSuggestions((prev) => ({ ...prev, [ingredientId]: [] }))
		setActiveInputId(null)
	}

	const handleVariantChange = (ingredientId: string, variantId: number) => {
		const ing = ingredients.find((i) => i.id === ingredientId)
		if (!ing?.variants) return

		const variant = ing.variants.find((v) => v.id === variantId)
		if (!variant) return

		onChange(
			ingredients.map((i) =>
				i.id === ingredientId
					? {
							...i,
							variantId: variant.id,
							variantName: variant.name,
							calories: variant.calories,
							protein: variant.protein,
							carbs: variant.carbs,
							fat: variant.fat,
							fiber: variant.fiber,
						}
					: i
			)
		)
	}

	const getAvailableUnits = (ing: IngredientItem): string[] => {
		if (ing.isFromDatabase && ing.conversions) {
			const conversionUnits = ing.conversions.map((c) => c.unitName)
			return [ing.baseUnit || 'g', ...conversionUnits]
		}
		return BASE_UNITS
	}

	const updateIngredient = (id: string, field: keyof IngredientItem, value: string | number) => {
		onChange(ingredients.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing)))
	}

	const handleUnitChange = (id: string, newUnit: string) => {
		const ing = ingredients.find((i) => i.id === id)
		if (!ing) return

		const availableUnits = getAvailableUnits(ing)

		if (availableUnits.includes(newUnit)) {
			updateIngredient(id, 'unit', newUnit)
		} else if (!ing.isFromDatabase) {
			updateIngredient(id, 'unit', newUnit)
		}
	}

	const handleAddNewConversion = async (ingredientId: string) => {
		const ing = ingredients.find((i) => i.id === ingredientId)
		if (!ing || !newUnitName || !newUnitGrams) return

		try {
			let dbId = ing.databaseId

			if (!dbId && ing.name) {
				const createdIng = await api.post<Suggestion>('/ingredients', {
					name: ing.name,
					unit: ing.baseUnit || 'g',
				})
				dbId = createdIng.id

				onChange(
					ingredients.map((i) =>
						i.id === ingredientId
							? { ...i, databaseId: dbId, isFromDatabase: true, baseUnit: createdIng.unit }
							: i
					)
				)
			}

			if (!dbId) return

			await api.post(`/ingredients/${dbId}/conversions`, {
				unitName: newUnitName,
				gramsPerUnit: parseFloat(newUnitGrams),
			})

			const updatedIng = await api.get<Suggestion>(`/ingredients/${dbId}`)

			onChange(
				ingredients.map((i) =>
					i.id === ingredientId
						? {
								...i,
								conversions: updatedIng.conversions,
								unit: newUnitName,
								databaseId: dbId,
								isFromDatabase: true,
							}
						: i
				)
			)

			setShowNewUnitModal(null)
			setNewUnitName('')
			setNewUnitGrams('')
		} catch (error) {
			console.error('Error adding conversion:', error)
		}
	}

	const handleVariantsChange = (
		ingredientId: string,
		variants: IngredientVariant[],
		selectedVariantId?: number
	) => {
		const selectedVariant =
			variants.find((v) => v.id === selectedVariantId) ||
			variants.find((v) => v.isDefault) ||
			variants[0]

		onChange(
			ingredients.map((i) =>
				i.id === ingredientId
					? {
							...i,
							variants,
							variantId: selectedVariant?.id,
							variantName: selectedVariant?.name,
							calories: selectedVariant?.calories,
							protein: selectedVariant?.protein,
							carbs: selectedVariant?.carbs,
							fat: selectedVariant?.fat,
							fiber: selectedVariant?.fiber,
						}
					: i
			)
		)
	}

	const handleCreateIngredient = async (ingredientId: string) => {
		const ing = ingredients.find((i) => i.id === ingredientId)
		if (!ing || !ing.name) return

		try {
			const createdIng = await api.post<Suggestion>('/ingredients', {
				name: ing.name,
				unit: ing.unit || 'g',
			})

			const defaultVariant =
				createdIng.variants?.find((v) => v.isDefault) || createdIng.variants?.[0]

			onChange(
				ingredients.map((i) =>
					i.id === ingredientId
						? {
								...i,
								databaseId: createdIng.id,
								isFromDatabase: true,
								baseUnit: createdIng.unit,
								variants: createdIng.variants,
								conversions: createdIng.conversions,
								variantId: defaultVariant?.id,
								variantName: defaultVariant?.name,
							}
						: i
				)
			)
		} catch (error) {
			console.error('Error creating ingredient:', error)
		}
	}

	const removeIngredient = (id: string) => {
		onChange(ingredients.filter((ing) => ing.id !== id))
	}

	const addIngredient = () => {
		onChange([
			...ingredients,
			{
				id: `ing-${Date.now()}`,
				name: '',
				quantity: 100,
				unit: 'g',
			},
		])
	}

	useEffect(() => {
		return () => {
			Object.values(debounceRef.current).forEach(clearTimeout)
		}
	}, [])

	return (
		<div className='ingredients-list-component'>
			{ingredients.length > 0 && (
				<div className='ingredients-table'>
					<div className='ingredients-table-header'>
						<span>{t('ingredients.ingredientLabel')}</span>
						<span>{t('ingredients.stateHeader')}</span>
						<span>{t('ingredients.quantityPlaceholder')}</span>
						<span>{t('ingredients.unitHeader')}</span>
						<span></span>
					</div>
					<div className='ingredients-table-body'>
						{ingredients.map((ing) => (
							<div key={ing.id} className='ingredient-row-container'>
								<div className='ingredients-table-row'>
									<div className='ingredient-input-wrapper'>
										{ing.name && !ing.isFromDatabase && (
											<span
												className='new-ingredient-badge'
												title={t('ingredients.newIngredientTitle')}>
												✨
											</span>
										)}
										<input
											type='text'
											className='form-input'
											value={capitalizeFirst(ing.name)}
											onChange={(e) => handleNameChange(ing.id, e.target.value)}
											onFocus={() => setActiveInputId(ing.id)}
											onBlur={() => setTimeout(() => setActiveInputId(null), 200)}
											onKeyDown={(e) => {
												if (e.key === 'Enter') e.preventDefault()
											}}
											placeholder={t('ingredients.namePlaceholder')}
											autoComplete='off'
										/>
										{activeInputId === ing.id && suggestions[ing.id]?.length > 0 && (
											<ul className='ingredient-suggestions'>
												{suggestions[ing.id].map((s) => (
													<li
														key={s.id}
														className='ingredient-suggestion-item'
														onMouseDown={() => handleSuggestionClick(ing.id, s)}>
														<span className='suggestion-icon'>🥬</span>
														<div className='suggestion-info'>
															<span className='suggestion-name'>{capitalizeFirst(s.name)}</span>
															{s.variants && s.variants.length > 1 && (
																<span className='suggestion-detail'>
																	{t('ingredients.statesCount', { count: s.variants.length })}
																</span>
															)}
														</div>
														<span className='suggestion-unit'>{s.unit}</span>
													</li>
												))}
											</ul>
										)}
									</div>
									<div className='variant-selector'>
										{ing.variants && ing.variants.length > 0 ? (
											<select
												className='form-input form-input-sm'
												value={ing.variantId || ''}
												onChange={(e) => handleVariantChange(ing.id, parseInt(e.target.value))}>
												{ing.variants.map((v) => (
													<option key={v.id} value={v.id}>
														{v.name}
													</option>
												))}
											</select>
										) : (
											<span className='variant-default'>{t('ingredients.rawVariant')}</span>
										)}
									</div>
									<input
										type='number'
										className='form-input'
										value={ing.quantity}
										onChange={(e) =>
											updateIngredient(ing.id, 'quantity', parseFloat(e.target.value) || 0)
										}
										onKeyDown={(e) => {
											if (e.key === 'Enter') e.preventDefault()
										}}
										min={0}
										step={0.1}
									/>
									<div className='unit-selector-wrapper'>
										<select
											className='form-input'
											value={ing.unit}
											onChange={(e) => handleUnitChange(ing.id, e.target.value)}>
											{getAvailableUnits(ing).map((u) => (
												<option key={u} value={u}>
													{u}
												</option>
											))}
										</select>
										{ing.name && (
											<button
												type='button'
												className='add-unit-btn'
												onClick={() => setShowNewUnitModal(ing.id)}
												title={t('ingredients.addUnitTitle')}>
												+
											</button>
										)}
									</div>
									<div className='ingredient-actions'>
										{ing.name && (
											<>
												<button
													type='button'
													className='ingredient-icon-btn'
													onClick={() =>
														setShowConversionsId(showConversionsId === ing.id ? null : ing.id)
													}
													title={t('ingredients.viewConversions')}>
													<ScaleIcon size={14} aria-hidden='true' />
												</button>
												<button
													type='button'
													className='ingredient-icon-btn'
													onClick={() => setShowMacrosId(showMacrosId === ing.id ? null : ing.id)}
													title={
														ing.isFromDatabase
															? t('ingredients.viewEditMacros')
															: t('ingredients.createAndAddMacros')
													}>
													<ChartIcon size={14} aria-hidden='true' />
												</button>
											</>
										)}
										<button
											type='button'
											className='ingredients-remove-btn'
											onClick={() => removeIngredient(ing.id)}>
											<CloseIcon size={14} aria-hidden='true' />
										</button>
									</div>
								</div>
								{showConversionsId === ing.id && ing.conversions && (
									<div className='ingredient-info-panel'>
										<div className='info-panel-header'>
											{t('ingredients.unitConversionsHeader')}
										</div>
										{ing.conversions.length > 0 ? (
											<ul className='conversions-list'>
												{ing.conversions.map((c) => (
													<li key={c.id}>
														1 {c.unitName} = {c.gramsPerUnit} {ing.baseUnit || 'g'}
													</li>
												))}
											</ul>
										) : (
											<p className='no-data'>{t('ingredients.noConversions')}</p>
										)}
									</div>
								)}
								{showMacrosId === ing.id &&
									(ing.databaseId && ing.variants ? (
										<IngredientStatesPanel
											data={{
												databaseId: ing.databaseId,
												name: ing.name,
												baseUnit: ing.baseUnit,
												variants: ing.variants,
												selectedVariantId: ing.variantId,
											}}
											onVariantsChange={(variants, selectedVariantId) =>
												handleVariantsChange(ing.id, variants, selectedVariantId)
											}
										/>
									) : (
										<div className='ingredient-info-panel new-ingredient-panel'>
											<div className='info-panel-header'>
												{t('ingredients.newIngredientName', { name: capitalizeFirst(ing.name) })}
											</div>
											<p className='new-ingredient-hint'>{t('ingredients.newIngredientHint')}</p>
											<button
												type='button'
												className='btn btn-primary btn-sm'
												onClick={() => handleCreateIngredient(ing.id)}>
												{t('ingredients.createAndConfigMacros')}
											</button>
										</div>
									))}
								{showNewUnitModal === ing.id && (
									<div className='new-unit-modal'>
										<div className='new-unit-modal-header'>
											<span>
												{t('ingredients.newUnitFor', { name: capitalizeFirst(ing.name) })}
											</span>
											<button
												type='button'
												className='modal-close-btn'
												onClick={() => {
													setShowNewUnitModal(null)
													setNewUnitName('')
													setNewUnitGrams('')
												}}>
												<CloseIcon size={14} aria-hidden='true' />
											</button>
										</div>
										<div className='new-unit-modal-body'>
											<div className='new-unit-row'>
												<span>1</span>
												<input
													type='text'
													className='form-input'
													value={newUnitName}
													onChange={(e) => setNewUnitName(e.target.value)}
													placeholder={t('ingredients.unitPlaceholder')}
												/>
												<span>=</span>
												<input
													type='number'
													className='form-input'
													value={newUnitGrams}
													onChange={(e) => setNewUnitGrams(e.target.value)}
													placeholder='0'
													min={0}
													step={0.1}
												/>
												<span>{ing.baseUnit || 'g'}</span>
											</div>
											<button
												type='button'
												className='btn btn-primary btn-sm'
												onClick={() => handleAddNewConversion(ing.id)}
												disabled={!newUnitName.trim() || !newUnitGrams}>
												{t('recipes.saveConversion')}
											</button>
										</div>
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			)}

			<button type='button' className='ingredients-add-btn' onClick={addIngredient}>
				{t('ingredients.addIngredientBtn')}
			</button>
		</div>
	)
}
