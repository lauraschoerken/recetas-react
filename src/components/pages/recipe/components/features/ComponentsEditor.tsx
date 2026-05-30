import './ComponentsEditor.scss'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { IngredientFormModal } from '@/components/pages/ingredient/containers/IngredientFormModal'
import { ChartIcon, CloseIcon, DotsIcon, ScaleIcon } from '@/components/shared/icons'
import {
	IngredientStatesPanel,
	IngredientVariant,
} from '@/components/shared/ingredient-states-panel'
import { api } from '@/services/api'
import { Ingredient } from '@/services/ingredient'
import {
	CreateComponentData,
	CreateComponentOptionData,
	Recipe,
	recipeService,
} from '@/services/recipe'
import { normalizeText } from '@/utils/normalize'

interface UnitConversion {
	id: number
	unitName: string
	gramsPerUnit: number
}

interface IngredientSuggestion {
	id: number
	name: string
	unit: string
	preferredUnit?: string | null
	conversions?: UnitConversion[]
	variants?: IngredientVariant[]
}

interface OptionIngredientData {
	databaseId?: number
	baseUnit?: string
	variants?: IngredientVariant[]
	conversions?: UnitConversion[]
	variantId?: number | null
	variantName?: string
}

interface ComponentsEditorProps {
	components: CreateComponentData[]
	onChange: (components: CreateComponentData[]) => void
	currentRecipeId?: number
	fixedIngredientNames?: string[]
	onConvertToFixed?: (compIndex: number) => void
	showErrors?: boolean
}

type OptionType = 'recipe' | 'ingredient'
type IngredientOptionField = 'ingredientName' | 'quantity' | 'unit'

function getOptionType(opt: CreateComponentOptionData): OptionType {
	const hasRecipeId = 'recipeId' in opt
	const hasIngredientName = 'ingredientName' in opt

	if (hasRecipeId && !hasIngredientName) return 'recipe'
	if (hasIngredientName && !hasRecipeId) return 'ingredient'

	if (opt.recipeId) return 'recipe'
	return 'ingredient'
}

function capitalizeFirst(str: string): string {
	if (!str) return str
	return str.charAt(0).toUpperCase() + str.slice(1)
}

export function ComponentsEditor({
	components,
	onChange,
	currentRecipeId,
	fixedIngredientNames = [],
	onConvertToFixed,
	showErrors = false,
}: ComponentsEditorProps) {
	const { t } = useTranslation()
	const fixedIngredientSet = useMemo(() => new Set(fixedIngredientNames), [fixedIngredientNames])
	const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([])
	const [suggestions, setSuggestions] = useState<Record<string, IngredientSuggestion[]>>({})
	const [activeInput, setActiveInput] = useState<string | null>(null)
	const [ingredientData, setIngredientData] = useState<Record<string, OptionIngredientData>>({})
	const [showMacrosId, setShowMacrosId] = useState<string | null>(null)
	const [showConversionsId, setShowConversionsId] = useState<string | null>(null)
	const [forcedFullIndices, setForcedFullIndices] = useState<Set<number>>(new Set())
	const [optionMenuOpen, setOptionMenuOpen] = useState<string | null>(null)
	const [ingredientModal, setIngredientModal] = useState<{
		compIndex: number
		optIndex: number
		data: Ingredient | null
		defaultName?: string
	} | null>(null)
	const debounceRef = useRef<Record<string, NodeJS.Timeout>>({})

	useEffect(() => {
		recipeService
			.getAll()
			.then((recipes) => {
				setAvailableRecipes(
					currentRecipeId ? recipes.filter((r) => r.id !== currentRecipeId) : recipes
				)
			})
			.catch(console.error)
	}, [currentRecipeId])

	// Inicializar ingredientData con los datos que vienen en las opciones
	useEffect(() => {
		const newData: Record<string, OptionIngredientData> = {}

		for (let compIndex = 0; compIndex < components.length; compIndex++) {
			const comp = components[compIndex]
			for (let optIndex = 0; optIndex < comp.options.length; optIndex++) {
				const opt = comp.options[optIndex]
				const inputId = `${compIndex}-${optIndex}`

				// Si ya tenemos datos para este input, saltar
				if (ingredientData[inputId]?.databaseId) continue

				// Si la opción tiene datos de ingrediente, usarlos
				if (opt.ingredientId) {
					const defaultVariant =
						opt.ingredientVariants?.find((v) => v.isDefault) || opt.ingredientVariants?.[0]
					newData[inputId] = {
						databaseId: opt.ingredientId,
						baseUnit: opt.ingredientBaseUnit,
						variants: opt.ingredientVariants,
						conversions: opt.ingredientConversions,
						variantId: defaultVariant?.id,
						variantName: defaultVariant?.name,
					}
				}
			}
		}

		if (Object.keys(newData).length > 0) {
			setIngredientData((prev) => ({ ...prev, ...newData }))
		}
	}, [components]) // Se ejecuta cuando cambian los componentes

	useEffect(() => {
		return () => {
			Object.values(debounceRef.current).forEach(clearTimeout)
		}
	}, [])

	useEffect(() => {
		if (!optionMenuOpen) return
		const close = () => setOptionMenuOpen(null)
		document.addEventListener('click', close)
		return () => document.removeEventListener('click', close)
	}, [optionMenuOpen])

	const mergeGroups = (sourceIndex: number, targetIndex: number) => {
		const sourceOptions = components[sourceIndex].options
		const updated = components
			.map((c, i) => {
				if (i === targetIndex) return { ...c, options: [...c.options, ...sourceOptions] }
				return c
			})
			.filter((_, i) => i !== sourceIndex)
		onChange(updated)
		setOptionMenuOpen(null)
	}

	const searchIngredients = async (query: string, inputId: string) => {
		if (query.length < 3) {
			setSuggestions((prev) => ({ ...prev, [inputId]: [] }))
			return
		}

		try {
			const results = await api.get<IngredientSuggestion[]>(
				`/ingredients/search?q=${encodeURIComponent(query)}`
			)
			setSuggestions((prev) => ({ ...prev, [inputId]: results }))
		} catch {
			setSuggestions((prev) => ({ ...prev, [inputId]: [] }))
		}
	}

	const addComponent = () => {
		onChange([
			...components,
			{
				name: '',
				sortOrder: components.length,
				isOptional: false,
				options: [{ name: '', isDefault: true, ingredientName: '' }],
			},
		])
	}

	const removeComponent = (index: number) => {
		const updated = [...components]
		updated.splice(index, 1)
		onChange(updated)
		setForcedFullIndices((prev) => {
			const next = new Set<number>()
			prev.forEach((i) => {
				if (i < index) next.add(i)
				else if (i > index) next.add(i - 1)
			})
			return next
		})
	}

	const updateComponent = (
		index: number,
		field: keyof CreateComponentData,
		value: CreateComponentData[keyof CreateComponentData]
	) => {
		const updated = [...components]
		if (field === 'name' && typeof value === 'string') {
			value = capitalizeFirst(value)
		}
		updated[index] = { ...updated[index], [field]: value }
		onChange(updated)
	}

	const addOption = (compIndex: number) => {
		const updated = [...components]
		updated[compIndex].options.push({ name: '', isDefault: false, ingredientName: '' })
		onChange(updated)
	}

	const removeOption = (compIndex: number, optIndex: number) => {
		const updated = [...components]
		updated[compIndex].options.splice(optIndex, 1)
		if (updated[compIndex].options.length === 0) {
			updated[compIndex].options.push({ name: '', isDefault: true, ingredientName: '' })
		} else if (!updated[compIndex].options.some((o) => o.isDefault)) {
			updated[compIndex].options[0].isDefault = true
		}
		onChange(updated)
	}

	const setOptionDefault = (compIndex: number, optIndex: number) => {
		const updated = [...components]
		updated[compIndex].options.forEach((opt, i) => {
			opt.isDefault = i === optIndex
		})
		onChange(updated)
	}

	const changeOptionType = (compIndex: number, optIndex: number, newType: OptionType) => {
		const updated = JSON.parse(JSON.stringify(components))
		const oldOption = updated[compIndex].options[optIndex]

		const newOption: CreateComponentOptionData = {
			name: oldOption.name || '',
			isDefault: oldOption.isDefault,
		}

		if (newType === 'recipe') {
			newOption.recipeId = null
			newOption.recipeServings = 1
		} else {
			newOption.ingredientName = ''
			newOption.quantity = undefined
			newOption.unit = 'g'
		}

		updated[compIndex].options[optIndex] = newOption
		onChange(updated)
	}

	const updateRecipeOption = (
		compIndex: number,
		optIndex: number,
		recipeId: number | undefined
	) => {
		const updated = [...components]
		const recipe = availableRecipes.find((r) => r.id === recipeId)
		updated[compIndex].options[optIndex] = {
			...updated[compIndex].options[optIndex],
			recipeId,
			name: recipe?.title || '',
		}
		onChange(updated)
	}

	const updateRecipeServings = (compIndex: number, optIndex: number, servings: number) => {
		const updated = [...components]
		updated[compIndex].options[optIndex].recipeServings = servings
		onChange(updated)
	}

	const updateIngredientOption = (
		compIndex: number,
		optIndex: number,
		field: IngredientOptionField,
		value: string | number | undefined
	) => {
		const updated = [...components]
		const opt = updated[compIndex].options[optIndex]

		if (field === 'ingredientName') {
			const capitalized = capitalizeFirst(typeof value === 'string' ? value : '')
			opt.ingredientName = capitalized
			opt.name = capitalized

			// Buscar con debounce
			const inputId = `${compIndex}-${optIndex}`
			if (debounceRef.current[inputId]) {
				clearTimeout(debounceRef.current[inputId])
			}
			debounceRef.current[inputId] = setTimeout(() => {
				searchIngredients(capitalized, inputId)
			}, 300)
		} else if (field === 'quantity') {
			opt.quantity = typeof value === 'number' ? value : undefined
		} else if (field === 'unit') {
			opt.unit = typeof value === 'string' ? value : undefined
		}

		onChange(updated)
	}

	const selectSuggestion = (
		compIndex: number,
		optIndex: number,
		suggestion: IngredientSuggestion
	) => {
		const updated = [...components]
		const opt = updated[compIndex].options[optIndex]
		const capitalized = capitalizeFirst(suggestion.name)
		opt.ingredientName = capitalized
		opt.name = capitalized
		opt.unit = suggestion.preferredUnit ?? suggestion.unit
		opt.ingredientId = suggestion.id
		opt.ingredientVariants = suggestion.variants
		opt.ingredientConversions = suggestion.conversions
		onChange(updated)

		const inputId = `${compIndex}-${optIndex}`
		setSuggestions((prev) => ({ ...prev, [inputId]: [] }))
		setActiveInput(null)

		// Guardar datos del ingrediente en estado local también
		const defaultVariant = suggestion.variants?.find((v) => v.isDefault) || suggestion.variants?.[0]
		setIngredientData((prev) => ({
			...prev,
			[inputId]: {
				databaseId: suggestion.id,
				baseUnit: suggestion.unit,
				variants: suggestion.variants,
				conversions: suggestion.conversions,
				variantId: defaultVariant?.id,
				variantName: defaultVariant?.name,
			},
		}))
	}

	const handleIngredientDataChange = (
		inputId: string,
		variants: IngredientVariant[],
		selectedVariantId?: number
	) => {
		const selectedVariant =
			variants.find((v) => v.id === selectedVariantId) ||
			variants.find((v) => v.isDefault) ||
			variants[0]

		setIngredientData((prev) => ({
			...prev,
			[inputId]: {
				...prev[inputId],
				variants,
				variantId: selectedVariant?.id,
				variantName: selectedVariant?.name,
			},
		}))

		// También actualizar el estado components para que se reflejen en Nutrición
		const [compIndex, optIndex] = inputId.split('-').map(Number)
		const updated = [...components]
		if (updated[compIndex]?.options[optIndex]) {
			updated[compIndex].options[optIndex].ingredientVariants = variants
			onChange(updated)
		}
	}

	const handleCreateIngredient = async (inputId: string, name: string, unit: string) => {
		if (!name) return

		try {
			const createdIng = await api.post<IngredientSuggestion>('/ingredients', { name, unit })
			const defaultVariant =
				createdIng.variants?.find((v) => v.isDefault) || createdIng.variants?.[0]

			setIngredientData((prev) => ({
				...prev,
				[inputId]: {
					...prev[inputId],
					databaseId: createdIng.id,
					baseUnit: createdIng.unit,
					variants: createdIng.variants,
					conversions: createdIng.conversions,
					variantId: defaultVariant?.id,
					variantName: defaultVariant?.name,
				},
			}))

			// Actualizar el componente con el ingredientId
			const [compIndex, optIndex] = inputId.split('-').map(Number)
			const updated = [...components]
			if (updated[compIndex]?.options[optIndex]) {
				updated[compIndex].options[optIndex].ingredientId = createdIng.id
				updated[compIndex].options[optIndex].ingredientVariants = createdIng.variants
				updated[compIndex].options[optIndex].ingredientConversions = createdIng.conversions
				onChange(updated)
			}
		} catch (error) {
			console.error('Error creating ingredient:', error)
		}
	}

	const isOptionDuplicatedWithFixed = (opt: CreateComponentOptionData): boolean => {
		const normalizedName = normalizeText(opt.ingredientName || '')
		return normalizedName !== '' && fixedIngredientSet.has(normalizedName)
	}

	return (
		<div className='components-editor'>
			{components.length === 0 ? (
				<div className='components-empty'>{t('recipes.noVariants')}</div>
			) : (
				<div className='components-list'>
					{components.map((comp, compIndex) => {
						const isSimpleOptional =
							comp.isOptional &&
							comp.options.length === 1 &&
							getOptionType(comp.options[0]) === 'ingredient' &&
							!!comp.options[0].ingredientName?.trim() &&
							!forcedFullIndices.has(compIndex)

						if (isSimpleOptional) {
							const opt = comp.options[0]
							return (
								<div key={compIndex} className='simple-optional-card'>
									<label
										className='simple-optional-toggle'
										title={t('recipes.simpleOptionalDefaultHint')}>
										<input
											type='checkbox'
											checked={comp.defaultEnabled !== false}
											onChange={(e) =>
												updateComponent(compIndex, 'defaultEnabled', e.target.checked)
											}
										/>
										<span className='simple-optional-name'>
											{opt.ingredientName || comp.name || '—'}
										</span>
										{opt.quantity != null && (
											<span className='simple-optional-qty'>
												{opt.quantity} {opt.unit || 'g'}
											</span>
										)}
										<span
											className={`simple-optional-badge${comp.defaultEnabled !== false ? ' is-on' : ''}`}>
											{comp.defaultEnabled !== false
												? t('recipes.simpleOptionalDefaultOn')
												: t('recipes.simpleOptionalDefaultOff')}
										</span>
									</label>
									<div className='group-type-selector simple-optional-type-selector'>
										<button
											type='button'
											className='group-type-btn'
											onClick={() => {
												const updated = [...components]
												updated[compIndex] = {
													...updated[compIndex],
													isOptional: false,
													defaultEnabled: undefined,
												}
												onChange(updated)
											}}>
											{t('recipes.groupTypeMandatory')}
										</button>
										<button type='button' className='group-type-btn active'>
											{t('recipes.groupTypeOptional')}
										</button>
									</div>
									<div className='simple-optional-actions'>
										<button
											type='button'
											className='simple-optional-alt-btn'
											onClick={() => addOption(compIndex)}>
											{t('recipes.addAlternatives')}
										</button>
										<button
											type='button'
											className='simple-optional-expand-btn'
											onClick={() => setForcedFullIndices((prev) => new Set([...prev, compIndex]))}
											title={t('recipes.expandGroup')}>
											✎
										</button>
										<button
											type='button'
											className='variant-remove-btn'
											onClick={() => removeComponent(compIndex)}
											title={t('recipes.deleteVariant')}>
											<CloseIcon size={14} aria-hidden='true' />
										</button>
									</div>
								</div>
							)
						}

						return (
							<div
								key={compIndex}
								className={`variant-card${
									showErrors &&
									!comp.isOptional &&
									comp.options.filter((o) => o.ingredientName?.trim() || o.recipeId).length < 2
										? ' variant-card--error'
										: ''
								}`}>
								<div className='variant-header'>
									<input
										type='text'
										className='variant-name-input'
										value={comp.name}
										onChange={(e) => updateComponent(compIndex, 'name', e.target.value)}
										placeholder={t('recipes.groupNamePlaceholder')}
									/>
									<div className='variant-flags'>
										<div className='group-type-selector'>
											<button
												type='button'
												className={`group-type-btn${!comp.isOptional ? ' active' : ''}`}
												onClick={() => {
													const updated = [...components]
													updated[compIndex] = {
														...updated[compIndex],
														isOptional: false,
														defaultEnabled: undefined,
													}
													onChange(updated)
												}}
												title={t('recipes.mandatoryGroupHint')}>
												{t('recipes.groupTypeMandatory')}
											</button>
											<button
												type='button'
												className={`group-type-btn${comp.isOptional ? ' active' : ''}`}
												onClick={() => {
													updateComponent(compIndex, 'isOptional', true)
													if (comp.defaultEnabled === undefined) {
														updateComponent(compIndex, 'defaultEnabled', true)
													}
												}}
												title={t('recipes.optionalGroupHint')}>
												{t('recipes.groupTypeOptional')}
											</button>
										</div>
										{comp.isOptional && (
											<label className='variant-flag included-flag'>
												<input
													type='checkbox'
													checked={comp.defaultEnabled !== false}
													onChange={(e) =>
														updateComponent(compIndex, 'defaultEnabled', e.target.checked)
													}
												/>
												<span>{t('recipes.includedByDefault')}</span>
											</label>
										)}
									</div>
									<button
										type='button'
										className='variant-remove-btn'
										onClick={() => removeComponent(compIndex)}
										title={t('recipes.deleteVariant')}>
										<CloseIcon size={14} aria-hidden='true' />
									</button>
								</div>
								<p className='group-type-hint'>
									{comp.isOptional
										? t('recipes.optionalGroupHint')
										: t('recipes.mandatoryGroupHint')}
								</p>

								<div className='variant-options'>
									<div className='options-header'>
										<span>{t('recipes.option')}</span>
										<span>{t('recipes.quantityLabel')}</span>
										<span>{t('recipes.unitLabel')}</span>
										<span></span>
									</div>
									{comp.options.map((opt, optIndex) => {
										const optionType = getOptionType(opt)
										const showAsDefault =
											opt.isDefault && (!comp.isOptional || comp.defaultEnabled !== false)
										const inputId = `${compIndex}-${optIndex}`
										const hasSuggestions = suggestions[inputId]?.length > 0
										const duplicatedWithFixed =
											optionType === 'ingredient' && isOptionDuplicatedWithFixed(opt)

										return (
											<div key={optIndex} className='option-container'>
												<div className={`option-row ${showAsDefault ? 'is-default' : ''}`}>
													<div className='option-main'>
														<input
															type='radio'
															name={`default-${compIndex}`}
															checked={opt.isDefault}
															onChange={() => setOptionDefault(compIndex, optIndex)}
															title={t('recipes.defaultBadge')}
														/>
														<button
															type='button'
															className={`type-toggle ${optionType === 'ingredient' ? 'is-ingredient' : 'is-recipe'}`}
															onClick={() =>
																changeOptionType(
																	compIndex,
																	optIndex,
																	optionType === 'ingredient' ? 'recipe' : 'ingredient'
																)
															}
															title={
																optionType === 'ingredient'
																	? t('recipes.switchToRecipe')
																	: t('recipes.switchToIngredient')
															}>
															{optionType === 'ingredient' ? '🥕' : '📖'}
														</button>
														{optionType === 'recipe' ? (
															<select
																className='form-input name-input'
																value={opt.recipeId || ''}
																onChange={(e) =>
																	updateRecipeOption(
																		compIndex,
																		optIndex,
																		e.target.value ? parseInt(e.target.value) : undefined
																	)
																}>
																<option value=''>{t('recipes.selectRecipe')}</option>
																{availableRecipes.map((r) => (
																	<option key={r.id} value={r.id}>
																		{r.title}
																	</option>
																))}
															</select>
														) : (
															<div className='ingredient-input-wrapper'>
																{opt.ingredientName && !ingredientData[inputId]?.databaseId && (
																	<span
																		className='new-ingredient-badge'
																		title={t('recipes.newIngredient')}>
																		✨
																	</span>
																)}
																<input
																	type='text'
																	className='form-input name-input'
																	value={opt.ingredientName || ''}
																	onChange={(e) =>
																		updateIngredientOption(
																			compIndex,
																			optIndex,
																			'ingredientName',
																			e.target.value
																		)
																	}
																	onFocus={() => setActiveInput(inputId)}
																	onBlur={() => setTimeout(() => setActiveInput(null), 200)}
																	onKeyDown={(e) => {
																		if (e.key === 'Enter') e.preventDefault()
																	}}
																	placeholder={t('ingredients.namePlaceholder')}
																	autoComplete='off'
																/>
																{activeInput === inputId && hasSuggestions && (
																	<ul className='ingredient-suggestions'>
																		{suggestions[inputId].map((s) => {
																			const existsInFixed = fixedIngredientSet.has(normalizeText(s.name))
																			return (
																				<li
																					key={s.id}
																					className='ingredient-suggestion-item'
																					onMouseDown={() => selectSuggestion(compIndex, optIndex, s)}
																					title={
																						existsInFixed
																							? t('recipes.ingredientAlreadyInFixedSuggestion')
																							: undefined
																					}>
																					<span className='suggestion-icon'>🥕</span>
																					<div className='suggestion-info'>
																						<span className='suggestion-name'>{capitalizeFirst(s.name)}</span>
																						{existsInFixed && (
																							<span className='suggestion-detail'>
																								{t('recipes.ingredientAlreadyInFixedSuggestion')}
																							</span>
																						)}
																						{s.variants && s.variants.length > 1 && (
																							<span className='suggestion-detail'>
																								{t('ingredients.statesCount', {
																									count: s.variants.length,
																								})}
																							</span>
																						)}
																					</div>
																					<span className='suggestion-unit'>{s.unit}</span>
																				</li>
																			)
																		})}
																	</ul>
																)}
															</div>
														)}
													</div>
													<div className='option-quantity'>
														{optionType === 'recipe' ? (
															<input
																type='number'
																className='form-input'
																value={opt.recipeServings || 1}
																onChange={(e) =>
																	updateRecipeServings(
																		compIndex,
																		optIndex,
																		parseFloat(e.target.value) || 1
																	)
																}
																min={0.1}
																step={0.1}
																title={t('recipes.rationsTitle')}
															/>
														) : (
															<input
																type='number'
																className='form-input'
																value={opt.quantity || ''}
																onChange={(e) =>
																	updateIngredientOption(
																		compIndex,
																		optIndex,
																		'quantity',
																		e.target.value ? parseFloat(e.target.value) : undefined
																	)
																}
																placeholder='100'
																min={0}
															/>
														)}
													</div>
													<div className='option-unit'>
														{optionType === 'recipe' ? (
															<span className='unit-label'>{t('recipes.rationsUnit')}</span>
														) : (
															<select
																className='form-input'
																value={opt.unit || 'g'}
																onChange={(e) =>
																	updateIngredientOption(
																		compIndex,
																		optIndex,
																		'unit',
																		e.target.value
																	)
																}>
																{ingredientData[inputId]?.baseUnit ? (
																	<>
																		<option value={ingredientData[inputId].baseUnit!}>{ingredientData[inputId].baseUnit}</option>
																		{(ingredientData[inputId].conversions ?? []).map((c) => (
																			<option key={c.unitName} value={c.unitName}>{c.unitName}</option>
																		))}
																	</>
																) : (
																	<>
																		<option value='g'>g</option>
																		<option value='ml'>ml</option>
																		<option value='kg'>kg</option>
																		<option value='l'>l</option>
																		<option value='unidad'>ud</option>
																		{ingredientData[inputId]?.conversions?.map((c) => (
																			<option key={c.unitName} value={c.unitName}>{c.unitName}</option>
																		))}
																	</>
																)}
															</select>
														)}
													</div>
													<div className='option-actions'>
														{optionType === 'ingredient' && opt.ingredientName && (
															<>
																<button
																	type='button'
																	className='option-icon-btn'
																	onClick={() =>
																		setShowConversionsId(
																			showConversionsId === inputId ? null : inputId
																		)
																	}
																	title={t('recipes.viewConversions')}>
																	<ScaleIcon size={14} aria-hidden='true' />
																</button>
																<button
																	type='button'
																	className='option-icon-btn'
																	onClick={() =>
																		setShowMacrosId(showMacrosId === inputId ? null : inputId)
																	}
																	title={
																		ingredientData[inputId]?.databaseId
																			? t('recipes.viewMacros')
																			: t('recipes.createAndAddMacros')
																	}>
																	<ChartIcon size={14} aria-hidden='true' />
																</button>
																<div className='option-menu-wrapper'>
																	<button
																		type='button'
																		className='option-icon-btn'
																		onClick={(e) => {
																			e.stopPropagation()
																			setOptionMenuOpen(optionMenuOpen === inputId ? null : inputId)
																		}}
																		title='Más opciones'>
																		<DotsIcon size={14} aria-hidden='true' />
																	</button>
																	{optionMenuOpen === inputId && (
																		<div className='option-dropdown'>
																			<button
																				type='button'
																				className='option-dropdown-item'
																				onClick={async () => {
																					setOptionMenuOpen(null)
																					if (ingredientData[inputId]?.databaseId) {
																						try {
																							const data = await api.get<Ingredient>(
																								`/ingredients/${ingredientData[inputId].databaseId}`
																							)
																							setIngredientModal({ compIndex, optIndex, data })
																						} catch {
																							console.error('Error cargando ingrediente')
																						}
																					} else {
																						setIngredientModal({
																							compIndex,
																							optIndex,
																							data: null,
																							defaultName: opt.ingredientName || '',
																						})
																					}
																				}}>
																				{t('ingredients.viewEditMacros')}
																			</button>
																			{components.length > 1 && (
																				<>
																					<div className='option-dropdown-divider' />
																					<div className='option-dropdown-section-label'>
																						{t('recipes.mergeGroupsLabel')}
																					</div>
																					{components.map((c, i) => {
																						if (i === compIndex) return null
																						return (
																							<button
																								key={i}
																								type='button'
																								className='option-dropdown-item'
																								onClick={() => mergeGroups(compIndex, i)}>
																								→ {c.name || '...'}
																							</button>
																						)
																					})}
																				</>
																			)}
																		</div>
																	)}
																</div>
															</>
														)}
														<button
															type='button'
															className='option-remove-btn'
															onClick={() => removeOption(compIndex, optIndex)}
															title={t('delete')}>
															<CloseIcon size={14} aria-hidden='true' />
														</button>
													</div>
												</div>
												{duplicatedWithFixed && (
													<p className='option-duplicate-warning'>
														⚠{' '}
														{t('recipes.ingredientAlreadyInFixedInfo', {
															name: opt.ingredientName,
														})}
													</p>
												)}
												{showConversionsId === inputId && ingredientData[inputId]?.conversions && (
													<div className='option-info-panel'>
														<div className='info-panel-header'>{t('recipes.unitConversions')}</div>
														{ingredientData[inputId].conversions!.length > 0 ? (
															<ul className='conversions-list'>
																{ingredientData[inputId].conversions!.map((c) => (
																	<li key={c.id}>
																		1 {c.unitName} = {c.gramsPerUnit}g
																	</li>
																))}
															</ul>
														) : (
															<p className='no-data'>{t('recipes.noConversions')}</p>
														)}
													</div>
												)}
												{showMacrosId === inputId &&
													(ingredientData[inputId]?.databaseId &&
													ingredientData[inputId]?.variants ? (
														<IngredientStatesPanel
															data={{
																databaseId: ingredientData[inputId].databaseId!,
																name: opt.ingredientName || '',
																variants: ingredientData[inputId].variants!,
																selectedVariantId: ingredientData[inputId].variantId,
															}}
															onVariantsChange={(variants, selectedVariantId) =>
																handleIngredientDataChange(inputId, variants, selectedVariantId)
															}
														/>
													) : (
														<div className='option-info-panel new-ingredient-panel'>
															<div className='info-panel-header'>
																{t('ingredients.newIngredientName', {
																	name: capitalizeFirst(opt.ingredientName || ''),
																})}
															</div>
															<p className='new-ingredient-hint'>
																{t('recipes.newIngredientNoExist')}
															</p>
															<button
																type='button'
																className='btn btn-primary btn-sm'
																onClick={() =>
																	handleCreateIngredient(
																		inputId,
																		opt.ingredientName || '',
																		opt.unit || 'g'
																	)
																}>
																{t('recipes.createAndConfigMacros')}
															</button>
														</div>
													))}
											</div>
										)
									})}
									<button
										type='button'
										className='add-option-btn'
										onClick={() => addOption(compIndex)}>
										{t('recipes.addOption')}
									</button>
									{!comp.isOptional &&
										comp.options.filter((o) => o.ingredientName?.trim() || o.recipeId).length <
											2 && (
											<div className='mandatory-single-warning'>
												<span>⚠ {t('recipes.mandatorySingleWarning')}</span>
												<div className='mandatory-single-actions'>
													<button
														type='button'
														className='btn btn-sm'
														onClick={() => addOption(compIndex)}>
														{t('recipes.addAnotherOption')}
													</button>
													{onConvertToFixed &&
														comp.options.length === 1 &&
														getOptionType(comp.options[0]) === 'ingredient' &&
														!!comp.options[0].ingredientName?.trim() && (
															<button
																type='button'
																className='btn btn-sm btn-secondary'
																onClick={() => onConvertToFixed(compIndex)}>
																{t('recipes.convertToFixedIngredient')}
															</button>
														)}
												</div>
											</div>
										)}
								</div>
							</div>
						)
					})}
				</div>
			)}

			<button type='button' className='add-variant-btn' onClick={addComponent}>
				{t('recipes.addVariant')}
			</button>

			{ingredientModal && (
				<IngredientFormModal
					isOpen={true}
					singleOnly={true}
					ingredient={ingredientModal.data}
					defaultName={ingredientModal.defaultName}
					onClose={() => setIngredientModal(null)}
					onSaved={() => setIngredientModal(null)}
				/>
			)}
		</div>
	)
}
