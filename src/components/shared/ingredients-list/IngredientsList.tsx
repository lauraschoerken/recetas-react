import './IngredientsList.scss'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ChartIcon, CloseIcon, DotsIcon, ScaleIcon } from '@/components/shared/icons'
import {
	IngredientStatesPanel,
	IngredientVariant,
} from '@/components/shared/ingredient-states-panel'
import { IngredientFormModal } from '@/components/pages/ingredient/containers/IngredientFormModal'
import { Ingredient } from '@/services/ingredient'
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
	pendingConversions?: { unitName: string; gramsPerUnit: number }[]
	pendingVariants?: {
		name: string
		calories?: number
		protein?: number
		carbs?: number
		fat?: number
		fiber?: number
	}[]
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
	const [showMacrosId, setShowMacrosId] = useState<string | null>(null)
	const [showConversionsId, setShowConversionsId] = useState<string | null>(null)
	const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
	const [ingredientModal, setIngredientModal] = useState<{
		ingId: string
		data: Ingredient | null
		defaultName?: string
	} | null>(null)
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

	const handleAddNewConversion = (ingredientId: string) => {
		const ing = ingredients.find((i) => i.id === ingredientId)
		if (!ing || !newUnitName.trim() || !newUnitGrams) return

		const unitName = newUnitName.trim().toLowerCase()
		const gramsPerUnit = parseFloat(newUnitGrams)

		// Añadir visualmente a conversions (con id temporal negativo) y a pendingConversions
		const tempId = -Date.now()
		onChange(
			ingredients.map((i) =>
				i.id === ingredientId
					? {
							...i,
							conversions: [
								...(i.conversions ?? []),
								{ id: tempId, unitName, gramsPerUnit, ingredientId: i.databaseId ?? 0 },
							],
							pendingConversions: [...(i.pendingConversions ?? []), { unitName, gramsPerUnit }],
							unit: unitName,
						}
					: i
			)
		)

		setNewUnitName('')
		setNewUnitGrams('')
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
										) : ing.pendingVariants && ing.pendingVariants.length > 0 ? (
											<select
												className='form-input form-input-sm'
												value={ing.variantName || ''}
												onChange={(e) =>
													onChange(
														ingredients.map((i) =>
															i.id === ing.id ? { ...i, variantName: e.target.value } : i
														)
													)
												}>
												{ing.pendingVariants.map((pv, idx) => (
													<option key={idx} value={pv.name || String(idx)}>
														{pv.name || `${t('ingredients.rawVariant')} ${idx + 1}`}
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
													className={`ingredient-icon-btn${ing.name && !ing.isFromDatabase && !(ing.pendingVariants && ing.pendingVariants.length > 0) ? ' ingredient-icon-btn--warning' : ''}`}
													onClick={() => {
														if (
															showMacrosId !== ing.id &&
															!ing.isFromDatabase &&
															!ing.pendingVariants
														) {
															onChange(
																ingredients.map((i) =>
																	i.id === ing.id
																		? {
																				...i,
																				pendingVariants: [{ name: t('ingredients.rawVariant') }],
																			}
																		: i
																)
															)
														}
														setShowMacrosId(showMacrosId === ing.id ? null : ing.id)
													}}
													title={
														ing.isFromDatabase
															? t('ingredients.viewEditMacros')
															: t('ingredients.createAndAddMacros')
													}>
													<ChartIcon size={14} aria-hidden='true' />
												</button>
											</>
										)}
										{ing.name && (
											<div className='ingredient-menu-wrapper'>
												<button
													type='button'
													className='ingredient-icon-btn'
													onClick={() => setMenuOpenId(menuOpenId === ing.id ? null : ing.id)}
													title='Más opciones'>
													<DotsIcon size={14} aria-hidden='true' />
												</button>
												{menuOpenId === ing.id && (
													<div className='ingredient-dropdown'>
														{!ing.isFromDatabase && (
															<button
																type='button'
																className='ingredient-dropdown-item'
																onClick={() => {
																	setMenuOpenId(null)
																	setIngredientModal({
																		ingId: ing.id,
																		data: null,
																		defaultName: ing.name,
																	})
																}}>
																{t('ingredients.viewEditMacros')}
															</button>
														)}
														{ing.isFromDatabase && ing.databaseId && (
															<button
																type='button'
																className='ingredient-dropdown-item'
																onClick={async () => {
																	setMenuOpenId(null)
																	try {
																		const data = await api.get<Ingredient>(
																			`/ingredients/${ing.databaseId}`
																		)
																		setIngredientModal({ ingId: ing.id, data })
																	} catch {
																		console.error('Error cargando ingrediente')
																	}
																}}>
																{t('ingredients.viewEditMacros')}
															</button>
														)}
													</div>
												)}
											</div>
										)}
										<button
											type='button'
											className='ingredients-remove-btn'
											onClick={() => removeIngredient(ing.id)}>
											<CloseIcon size={14} aria-hidden='true' />
										</button>
									</div>
								</div>
								{showConversionsId === ing.id && (
									<div className='ingredient-info-panel'>
										<div className='info-panel-header'>
											{t('ingredients.unitConversionsHeader')}
										</div>
										{ing.conversions && ing.conversions.length > 0 ? (
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
										{ing.name && (
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
										<div className='ingredient-info-panel'>
											<div className='info-panel-header'>{t('ingredients.createAndAddMacros')}</div>
											{(ing.pendingVariants ?? [{ name: '' }]).map((pv, pvIdx) => (
												<div key={pvIdx} className='pending-state-block'>
													<div className='pending-state-header'>
														<input
															type='text'
															className='form-input'
															placeholder={t('ingredients.stateNamePlaceholder')}
															value={pv.name}
															onChange={(e) => {
																const updated = (ing.pendingVariants ?? [{ name: '' }]).map(
																	(v, vi) => (vi === pvIdx ? { ...v, name: e.target.value } : v)
																)
																onChange(
																	ingredients.map((i) =>
																		i.id === ing.id ? { ...i, pendingVariants: updated } : i
																	)
																)
															}}
														/>
														{(ing.pendingVariants ?? []).length > 1 && (
															<button
																type='button'
																className='variant-action-btn delete'
																onClick={() => {
																	const updated = (ing.pendingVariants ?? []).filter(
																		(_, vi) => vi !== pvIdx
																	)
																	onChange(
																		ingredients.map((i) =>
																			i.id === ing.id ? { ...i, pendingVariants: updated } : i
																		)
																	)
																}}>
																<CloseIcon size={12} aria-hidden='true' />
															</button>
														)}
													</div>
													<div className='state-macros-edit pending-macros-row'>
														<div className='macro-input'>
															<input
																type='number'
																placeholder='0'
																min={0}
																step={0.1}
																value={pv.calories ?? ''}
																onChange={(e) => {
																	const updated = (ing.pendingVariants ?? [{ name: '' }]).map(
																		(v, vi) =>
																			vi === pvIdx
																				? {
																						...v,
																						calories: e.target.value
																							? parseFloat(e.target.value)
																							: undefined,
																					}
																				: v
																	)
																	onChange(
																		ingredients.map((i) =>
																			i.id === ing.id ? { ...i, pendingVariants: updated } : i
																		)
																	)
																}}
															/>
															<span>{t('ingredients.kcalUnit')}</span>
														</div>
														<div className='macro-input'>
															<input
																type='number'
																placeholder='0'
																min={0}
																step={0.1}
																value={pv.protein ?? ''}
																onChange={(e) => {
																	const updated = (ing.pendingVariants ?? [{ name: '' }]).map(
																		(v, vi) =>
																			vi === pvIdx
																				? {
																						...v,
																						protein: e.target.value
																							? parseFloat(e.target.value)
																							: undefined,
																					}
																				: v
																	)
																	onChange(
																		ingredients.map((i) =>
																			i.id === ing.id ? { ...i, pendingVariants: updated } : i
																		)
																	)
																}}
															/>
															<span>{t('ingredients.protUnit')}</span>
														</div>
														<div className='macro-input'>
															<input
																type='number'
																placeholder='0'
																min={0}
																step={0.1}
																value={pv.carbs ?? ''}
																onChange={(e) => {
																	const updated = (ing.pendingVariants ?? [{ name: '' }]).map(
																		(v, vi) =>
																			vi === pvIdx
																				? {
																						...v,
																						carbs: e.target.value
																							? parseFloat(e.target.value)
																							: undefined,
																					}
																				: v
																	)
																	onChange(
																		ingredients.map((i) =>
																			i.id === ing.id ? { ...i, pendingVariants: updated } : i
																		)
																	)
																}}
															/>
															<span>{t('ingredients.carbsUnit')}</span>
														</div>
														<div className='macro-input'>
															<input
																type='number'
																placeholder='0'
																min={0}
																step={0.1}
																value={pv.fat ?? ''}
																onChange={(e) => {
																	const updated = (ing.pendingVariants ?? [{ name: '' }]).map(
																		(v, vi) =>
																			vi === pvIdx
																				? {
																						...v,
																						fat: e.target.value
																							? parseFloat(e.target.value)
																							: undefined,
																					}
																				: v
																	)
																	onChange(
																		ingredients.map((i) =>
																			i.id === ing.id ? { ...i, pendingVariants: updated } : i
																		)
																	)
																}}
															/>
															<span>{t('ingredients.fatUnit')}</span>
														</div>
														<div className='macro-input'>
															<input
																type='number'
																placeholder='0'
																min={0}
																step={0.1}
																value={pv.fiber ?? ''}
																onChange={(e) => {
																	const updated = (ing.pendingVariants ?? [{ name: '' }]).map(
																		(v, vi) =>
																			vi === pvIdx
																				? {
																						...v,
																						fiber: e.target.value
																							? parseFloat(e.target.value)
																							: undefined,
																					}
																				: v
																	)
																	onChange(
																		ingredients.map((i) =>
																			i.id === ing.id ? { ...i, pendingVariants: updated } : i
																		)
																	)
																}}
															/>
															<span>{t('ingredients.fiberUnit')}</span>
														</div>
													</div>
												</div>
											))}
											<button
												type='button'
												className='btn btn-secondary btn-sm'
												onClick={() => {
													const updated = [...(ing.pendingVariants ?? [{ name: '' }]), { name: '' }]
													onChange(
														ingredients.map((i) =>
															i.id === ing.id ? { ...i, pendingVariants: updated } : i
														)
													)
												}}>
												{t('ingredients.addState')}
											</button>
										</div>
									))}
							</div>
						))}
					</div>
				</div>
			)}

			<button type='button' className='ingredients-add-btn' onClick={addIngredient}>
				{t('ingredients.addIngredientBtn')}
			</button>

			{ingredientModal && (
				<IngredientFormModal
					isOpen={true}
					singleOnly={true}
					ingredient={ingredientModal.data}
					defaultName={ingredientModal.defaultName}
					onClose={() => setIngredientModal(null)}
					onSaved={() => setIngredientModal(null)}
					onSavedIngredient={(created) => {
						const ingId = ingredientModal.ingId
						onChange(
							ingredients.map((i) =>
								i.id === ingId
									? {
											...i,
											isFromDatabase: true,
											databaseId: created.id,
											baseUnit: (created.unit as 'g' | 'ml') ?? 'g',
											variants: created.variants ?? [],
											pendingVariants: undefined,
											pendingConversions: undefined,
										}
									: i
							)
						)
						setIngredientModal(null)
					}}
				/>
			)}
		</div>
	)
}
