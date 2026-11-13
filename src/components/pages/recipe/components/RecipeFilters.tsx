import './RecipeFilters.scss'

import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { TagMultiSelect } from '@/components/shared/tag-multi-select/TagMultiSelect'
import { Ingredient, ingredientService } from '@/services/ingredient'
import { IngredientTag } from '@/services/ingredientExtras'

export interface RecipeFilterValues {
	hidden: 'exclude' | 'only'
	visibility: 'all' | 'public' | 'private'
	// Calorías (client-side)
	minCalories: string
	maxCalories: string
	// Macros client-side
	minProtein: string
	maxProtein: string
	minCarbs: string
	maxCarbs: string
	minFat: string
	maxFat: string
	minFiber: string
	maxFiber: string
	// Servidor
	difficulty: '' | 'easy' | 'medium' | 'hard'
	minCookTime: string
	maxCookTime: string
	ingredients: Array<{ id: number; name: string; unit?: string }>
	tagIds: number[]
	excludeTagIds: number[]
	// Ordenación
	sortBy: 'createdAt' | 'updatedAt' | 'title' | 'cookTimeMinutes' | 'difficulty'
	sortOrder: 'asc' | 'desc'
	// Autor
	authorId: number | null
}

interface RecipeFiltersProps {
	filters: RecipeFilterValues
	availableTags: IngredientTag[]
	authors: { id: number; name: string }[]
	onChange: (filters: RecipeFilterValues) => void
	onClear: () => void
	onClose: () => void
	activeCount: number
	hiddenTotal?: number
}

export const DEFAULT_FILTERS: RecipeFilterValues = {
	hidden: 'exclude',
	visibility: 'all',
	minCalories: '',
	maxCalories: '',
	minProtein: '',
	maxProtein: '',
	minCarbs: '',
	maxCarbs: '',
	minFat: '',
	maxFat: '',
	minFiber: '',
	maxFiber: '',
	difficulty: '',
	minCookTime: '',
	maxCookTime: '',
	ingredients: [],
	tagIds: [],
	excludeTagIds: [],
	sortBy: 'createdAt',
	sortOrder: 'desc',
	authorId: null,
}

export function RecipeFilters({
	filters,
	availableTags,
	authors,
	onChange,
	onClear,
	onClose,
	activeCount,
	hiddenTotal = 0,
}: RecipeFiltersProps) {
	const { t } = useTranslation()
	const ingredientInputId = useId()
	const ingredientListboxId = useId()

	// Estado local para inputs de texto (debounce)
	const [localIngredient, setLocalIngredient] = useState('')
	const [ingredientOptions, setIngredientOptions] = useState<Ingredient[]>([])
	const [ingredientOptionsOpen, setIngredientOptionsOpen] = useState(false)
	const [ingredientOptionsLoading, setIngredientOptionsLoading] = useState(false)
	const [activeIngredientIndex, setActiveIngredientIndex] = useState(-1)
	const [localMinCal, setLocalMinCal] = useState(filters.minCalories)
	const [localMaxCal, setLocalMaxCal] = useState(filters.maxCalories)
	const [localMinProt, setLocalMinProt] = useState(filters.minProtein)
	const [localMaxProt, setLocalMaxProt] = useState(filters.maxProtein)
	const [localMinCarbs, setLocalMinCarbs] = useState(filters.minCarbs)
	const [localMaxCarbs, setLocalMaxCarbs] = useState(filters.maxCarbs)
	const [localMinFat, setLocalMinFat] = useState(filters.minFat)
	const [localMaxFat, setLocalMaxFat] = useState(filters.maxFat)
	const [localMinFiber, setLocalMinFiber] = useState(filters.minFiber)
	const [localMaxFiber, setLocalMaxFiber] = useState(filters.maxFiber)
	const [localMinCook, setLocalMinCook] = useState(filters.minCookTime)
	const [localMaxCook, setLocalMaxCook] = useState(filters.maxCookTime)

	// Sincronizar cuando se limpia externamente
	useEffect(() => {
		if (filters.ingredients.length === 0) {
			setLocalIngredient('')
			setIngredientOptions([])
			setIngredientOptionsOpen(false)
		}
		if (filters.minCalories === '') setLocalMinCal('')
		if (filters.maxCalories === '') setLocalMaxCal('')
		if (filters.minProtein === '') setLocalMinProt('')
		if (filters.maxProtein === '') setLocalMaxProt('')
		if (filters.minCarbs === '') setLocalMinCarbs('')
		if (filters.maxCarbs === '') setLocalMaxCarbs('')
		if (filters.minFat === '') setLocalMinFat('')
		if (filters.maxFat === '') setLocalMaxFat('')
		if (filters.minFiber === '') setLocalMinFiber('')
		if (filters.maxFiber === '') setLocalMaxFiber('')
		if (filters.minCookTime === '') setLocalMinCook('')
		if (filters.maxCookTime === '') setLocalMaxCook('')
	}, [filters])

	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const ingredientSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const ingredientSearchRequestRef = useRef(0)

	useEffect(
		() => () => {
			if (debounceRef.current) clearTimeout(debounceRef.current)
			if (ingredientSearchTimerRef.current) clearTimeout(ingredientSearchTimerRef.current)
		},
		[]
	)

	const scheduleChange = (patch: Partial<RecipeFilterValues>) => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			onChange({
				...filters,
				minCalories: localMinCal,
				maxCalories: localMaxCal,
				minProtein: localMinProt,
				maxProtein: localMaxProt,
				minCarbs: localMinCarbs,
				maxCarbs: localMaxCarbs,
				minFat: localMinFat,
				maxFat: localMaxFat,
				minFiber: localMinFiber,
				maxFiber: localMaxFiber,
				minCookTime: localMinCook,
				maxCookTime: localMaxCook,
				...patch,
			})
		}, 500)
	}

	const updateImmediate = (patch: Partial<RecipeFilterValues>) => {
		onChange({
			...filters,
			minCalories: localMinCal,
			maxCalories: localMaxCal,
			minProtein: localMinProt,
			maxProtein: localMaxProt,
			minCarbs: localMinCarbs,
			maxCarbs: localMaxCarbs,
			minFat: localMinFat,
			maxFat: localMaxFat,
			minFiber: localMinFiber,
			maxFiber: localMaxFiber,
			minCookTime: localMinCook,
			maxCookTime: localMaxCook,
			...patch,
		})
	}

	const searchIngredientOptions = (value: string) => {
		if (ingredientSearchTimerRef.current) clearTimeout(ingredientSearchTimerRef.current)
		const query = value.trim()
		const requestId = ++ingredientSearchRequestRef.current

		if (!query) {
			setIngredientOptions([])
			setIngredientOptionsOpen(false)
			setIngredientOptionsLoading(false)
			setActiveIngredientIndex(-1)
			return
		}

		setIngredientOptionsLoading(true)
		setIngredientOptionsOpen(true)
		ingredientSearchTimerRef.current = setTimeout(async () => {
			try {
				const results = await ingredientService.search(query)
				if (ingredientSearchRequestRef.current !== requestId) return
				const selectedIds = new Set(filters.ingredients.map((ingredient) => ingredient.id))
				const availableResults = results.filter((ingredient) => !selectedIds.has(ingredient.id))
				setIngredientOptions(availableResults)
				setActiveIngredientIndex(availableResults.length > 0 ? 0 : -1)
			} catch {
				if (ingredientSearchRequestRef.current !== requestId) return
				setIngredientOptions([])
				setActiveIngredientIndex(-1)
			} finally {
				if (ingredientSearchRequestRef.current === requestId) {
					setIngredientOptionsLoading(false)
				}
			}
		}, 200)
	}

	const selectIngredient = (ingredient: Ingredient) => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		if (ingredientSearchTimerRef.current) clearTimeout(ingredientSearchTimerRef.current)
		ingredientSearchRequestRef.current += 1
		setLocalIngredient('')
		setIngredientOptions([])
		setIngredientOptionsOpen(false)
		setIngredientOptionsLoading(false)
		setActiveIngredientIndex(-1)
		if (!filters.ingredients.some((selected) => selected.id === ingredient.id)) {
			updateImmediate({
				ingredients: [
					...filters.ingredients,
					{ id: ingredient.id, name: ingredient.name, unit: ingredient.unit },
				],
			})
		}
	}

	const removeIngredient = (ingredientId: number) => {
		updateImmediate({
			ingredients: filters.ingredients.filter((ingredient) => ingredient.id !== ingredientId),
		})
	}

	const handleIngredientKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Escape') {
			setIngredientOptionsOpen(false)
			return
		}
		if (!ingredientOptionsOpen || ingredientOptions.length === 0) return
		if (event.key === 'ArrowDown') {
			event.preventDefault()
			setActiveIngredientIndex((current) => (current + 1) % ingredientOptions.length)
		} else if (event.key === 'ArrowUp') {
			event.preventDefault()
			setActiveIngredientIndex(
				(current) => (current - 1 + ingredientOptions.length) % ingredientOptions.length
			)
		} else if (event.key === 'Enter' && activeIngredientIndex >= 0) {
			event.preventDefault()
			selectIngredient(ingredientOptions[activeIngredientIndex])
		}
	}

	return (
		<div className='recipe-filters'>
			<div className='recipe-filters__header'>
				<div>
					<h2>{t('recipes.filterTitle')}</h2>
					<p>{t('recipes.filterHint')}</p>
				</div>
				<div className='recipe-filters__header-actions'>
					{activeCount > 0 && (
						<button type='button' className='btn btn-ghost btn-sm' onClick={onClear}>
							{t('recipes.filterClear')}
						</button>
					)}
					<button
						type='button'
						className='recipe-filters__close'
						onClick={onClose}
						aria-label={t('close')}>
						×
					</button>
				</div>
			</div>
			<div className='recipe-filters__group recipe-filters__group--collection'>
				<label className='recipe-filters__label'>{t('recipes.filterCollection')}</label>
				<div className='recipe-filters__radio-group'>
					{(['exclude', 'only'] as const).map((value) => (
						<label
							key={value}
							className={`recipe-filters__radio${filters.hidden === value ? ' active' : ''}`}>
							<input
								type='radio'
								name='hidden'
								value={value}
								checked={filters.hidden === value}
								onChange={() =>
									updateImmediate({
										hidden: value,
										visibility: value === 'only' ? 'all' : filters.visibility,
										authorId: null,
									})
								}
							/>
							{value === 'only'
								? `${t('recipes.filterHidden')} (${hiddenTotal})`
								: t('recipes.filterVisible')}
						</label>
					))}
				</div>
			</div>

			{/* ── Ordenación ── */}
			<div className='recipe-filters__group recipe-filters__group--sort'>
				<label className='recipe-filters__label'>{t('recipes.sortBy')}</label>
				<div className='recipe-filters__row'>
					<select
						className='form-input recipe-filters__select'
						value={filters.sortBy}
						onChange={(e) =>
							updateImmediate({ sortBy: e.target.value as RecipeFilterValues['sortBy'] })
						}>
						<option value='createdAt'>{t('recipes.sortCreatedAt')}</option>
						<option value='updatedAt'>{t('recipes.sortUpdatedAt')}</option>
						<option value='title'>{t('recipes.sortTitle')}</option>
						<option value='cookTimeMinutes'>{t('recipes.sortCookTime')}</option>
						<option value='difficulty'>{t('recipes.sortDifficulty')}</option>
					</select>
					<div className='recipe-filters__radio-group'>
						{(['asc', 'desc'] as const).map((o) => (
							<label
								key={o}
								className={`recipe-filters__radio${filters.sortOrder === o ? ' active' : ''}`}>
								<input
									type='radio'
									name='sortOrder'
									value={o}
									checked={filters.sortOrder === o}
									onChange={() => updateImmediate({ sortOrder: o })}
								/>
								{o === 'asc' ? '↑' : '↓'}
							</label>
						))}
					</div>
				</div>
			</div>

			{/* ── Visibilidad ── */}
			{filters.hidden !== 'only' && (
				<div className='recipe-filters__group recipe-filters__group--visibility'>
					<label className='recipe-filters__label'>{t('recipes.filterVisibility')}</label>
					<div className='recipe-filters__radio-group'>
						{(['all', 'public', 'private'] as const).map((v) => (
							<label
								key={v}
								className={`recipe-filters__radio${filters.visibility === v ? ' active' : ''}`}>
								<input
									type='radio'
									name='visibility'
									value={v}
									checked={filters.visibility === v}
									onChange={() => updateImmediate({ visibility: v })}
								/>
								{t(
									`recipes.filter${v.charAt(0).toUpperCase() + v.slice(1)}` as Parameters<
										typeof t
									>[0]
								)}
							</label>
						))}
					</div>
				</div>
			)}

			{/* ── Dificultad ── */}
			<div className='recipe-filters__group recipe-filters__group--difficulty'>
				<label className='recipe-filters__label'>{t('recipes.difficultyLabel')}</label>
				<select
					className='form-input recipe-filters__select'
					value={filters.difficulty}
					onChange={(e) =>
						updateImmediate({ difficulty: e.target.value as RecipeFilterValues['difficulty'] })
					}>
					<option value=''>{t('recipes.filterAll')}</option>
					<option value='easy'>{t('recipes.difficultyEasy')}</option>
					<option value='medium'>{t('recipes.difficultyMedium')}</option>
					<option value='hard'>{t('recipes.difficultyHard')}</option>
				</select>
			</div>

			{/* ── Tiempo de cocción ── */}
			<div className='recipe-filters__group'>
				<label className='recipe-filters__label'>{t('recipes.filterCookTime')}</label>
				<div className='recipe-filters__range-row'>
					<input
						type='number'
						className='form-input recipe-filters__input-sm'
						min={0}
						step={5}
						placeholder={t('recipes.filterMin')}
						value={localMinCook}
						onChange={(e) => {
							setLocalMinCook(e.target.value)
							scheduleChange({ minCookTime: e.target.value })
						}}
					/>
					<span className='recipe-filters__range-sep'>–</span>
					<input
						type='number'
						className='form-input recipe-filters__input-sm'
						min={0}
						step={5}
						placeholder={t('recipes.filterMax')}
						value={localMaxCook}
						onChange={(e) => {
							setLocalMaxCook(e.target.value)
							scheduleChange({ maxCookTime: e.target.value })
						}}
					/>
					<span className='recipe-filters__unit'>{t('recipes.minuteShort')}</span>
				</div>
			</div>

			{/* ── Calorías ── */}
			<div className='recipe-filters__group'>
				<label className='recipe-filters__label'>{t('recipes.filterCalories')}</label>
				<div className='recipe-filters__range-row'>
					<input
						type='number'
						className='form-input recipe-filters__input-sm'
						min={0}
						step={50}
						placeholder={t('recipes.filterMin')}
						value={localMinCal}
						onChange={(e) => {
							setLocalMinCal(e.target.value)
							scheduleChange({ minCalories: e.target.value })
						}}
					/>
					<span className='recipe-filters__range-sep'>–</span>
					<input
						type='number'
						className='form-input recipe-filters__input-sm'
						min={0}
						step={50}
						placeholder={t('recipes.filterMax')}
						value={localMaxCal}
						onChange={(e) => {
							setLocalMaxCal(e.target.value)
							scheduleChange({ maxCalories: e.target.value })
						}}
					/>
					<span className='recipe-filters__unit'>kcal</span>
				</div>
			</div>

			{/* ── Proteína ── */}
			<div className='recipe-filters__group'>
				<label className='recipe-filters__label'>{t('weekPlan.protein')}</label>
				<div className='recipe-filters__range-row'>
					<input
						type='number'
						className='form-input recipe-filters__input-sm'
						min={0}
						step={5}
						placeholder={t('recipes.filterMin')}
						value={localMinProt}
						onChange={(e) => {
							setLocalMinProt(e.target.value)
							scheduleChange({ minProtein: e.target.value })
						}}
					/>
					<span className='recipe-filters__range-sep'>–</span>
					<input
						type='number'
						className='form-input recipe-filters__input-sm'
						min={0}
						step={5}
						placeholder={t('recipes.filterMax')}
						value={localMaxProt}
						onChange={(e) => {
							setLocalMaxProt(e.target.value)
							scheduleChange({ maxProtein: e.target.value })
						}}
					/>
					<span className='recipe-filters__unit'>g</span>
				</div>
			</div>

			{/* ── Carbohidratos ── */}
			<div className='recipe-filters__group'>
				<label className='recipe-filters__label'>{t('weekPlan.carbs')}</label>
				<div className='recipe-filters__range-row'>
					<input
						type='number'
						className='form-input recipe-filters__input-sm'
						min={0}
						step={5}
						placeholder={t('recipes.filterMin')}
						value={localMinCarbs}
						onChange={(e) => {
							setLocalMinCarbs(e.target.value)
							scheduleChange({ minCarbs: e.target.value })
						}}
					/>
					<span className='recipe-filters__range-sep'>–</span>
					<input
						type='number'
						className='form-input recipe-filters__input-sm'
						min={0}
						step={5}
						placeholder={t('recipes.filterMax')}
						value={localMaxCarbs}
						onChange={(e) => {
							setLocalMaxCarbs(e.target.value)
							scheduleChange({ maxCarbs: e.target.value })
						}}
					/>
					<span className='recipe-filters__unit'>g</span>
				</div>
			</div>

			{/* ── Grasas ── */}
			<div className='recipe-filters__group'>
				<label className='recipe-filters__label'>{t('weekPlan.fat')}</label>
				<div className='recipe-filters__range-row'>
					<input
						type='number'
						className='form-input recipe-filters__input-sm'
						min={0}
						step={5}
						placeholder={t('recipes.filterMin')}
						value={localMinFat}
						onChange={(e) => {
							setLocalMinFat(e.target.value)
							scheduleChange({ minFat: e.target.value })
						}}
					/>
					<span className='recipe-filters__range-sep'>–</span>
					<input
						type='number'
						className='form-input recipe-filters__input-sm'
						min={0}
						step={5}
						placeholder={t('recipes.filterMax')}
						value={localMaxFat}
						onChange={(e) => {
							setLocalMaxFat(e.target.value)
							scheduleChange({ maxFat: e.target.value })
						}}
					/>
					<span className='recipe-filters__unit'>g</span>
				</div>
			</div>

			{/* ── Ingrediente ── */}
			<div className='recipe-filters__group'>
				<label className='recipe-filters__label'>{t('fiber')}</label>
				<div className='recipe-filters__range-row'>
					<input
						type='number'
						className='form-input recipe-filters__input-sm'
						min={0}
						step={1}
						placeholder={t('recipes.filterMin')}
						value={localMinFiber}
						onChange={(e) => {
							setLocalMinFiber(e.target.value)
							scheduleChange({ minFiber: e.target.value })
						}}
					/>
					<span className='recipe-filters__range-sep'>–</span>
					<input
						type='number'
						className='form-input recipe-filters__input-sm'
						min={0}
						step={1}
						placeholder={t('recipes.filterMax')}
						value={localMaxFiber}
						onChange={(e) => {
							setLocalMaxFiber(e.target.value)
							scheduleChange({ maxFiber: e.target.value })
						}}
					/>
					<span className='recipe-filters__unit'>g</span>
				</div>
			</div>

			{/* ── Ingrediente ── */}
			<div className='recipe-filters__group recipe-filters__group--ingredients'>
				<label className='recipe-filters__label' htmlFor={ingredientInputId}>
					{t('recipes.filterIngredient')}
				</label>
				<div className='recipe-filters__ingredient-combobox'>
					<input
						id={ingredientInputId}
						type='text'
						className='form-input recipe-filters__input'
						placeholder={
							filters.ingredients.length > 0
								? t('recipes.filterIngredientAddPlaceholder')
								: t('recipes.filterIngredientPlaceholder')
						}
						value={localIngredient}
						role='combobox'
						autoComplete='off'
						aria-autocomplete='list'
						aria-controls={ingredientListboxId}
						aria-expanded={ingredientOptionsOpen}
						aria-activedescendant={
							activeIngredientIndex >= 0
								? `${ingredientListboxId}-${ingredientOptions[activeIngredientIndex]?.id}`
								: undefined
						}
						onFocus={() => {
							if (localIngredient.trim()) searchIngredientOptions(localIngredient)
						}}
						onBlur={() => window.setTimeout(() => setIngredientOptionsOpen(false), 120)}
						onKeyDown={handleIngredientKeyDown}
						onChange={(e) => {
							const value = e.target.value
							setLocalIngredient(value)
							searchIngredientOptions(value)
						}}
					/>
					{ingredientOptionsOpen && (
						<div
							id={ingredientListboxId}
							className='recipe-filters__ingredient-options'
							role='listbox'>
							{ingredientOptionsLoading ? (
								<div className='recipe-filters__ingredient-message' role='status'>
									{t('ingredients.loading')}
								</div>
							) : ingredientOptions.length > 0 ? (
								ingredientOptions.map((ingredient, index) => (
									<button
										type='button'
										id={`${ingredientListboxId}-${ingredient.id}`}
										key={ingredient.id}
										className={`recipe-filters__ingredient-option${index === activeIngredientIndex ? ' active' : ''}`}
										role='option'
										aria-selected={index === activeIngredientIndex}
										onMouseDown={(event) => event.preventDefault()}
										onMouseEnter={() => setActiveIngredientIndex(index)}
										onClick={() => selectIngredient(ingredient)}>
										<strong>{ingredient.name}</strong>
										{ingredient.unit && <span>{ingredient.unit}</span>}
									</button>
								))
							) : (
								<div className='recipe-filters__ingredient-message'>
									{t('ingredients.noResults')}
								</div>
							)}
						</div>
					)}
					{filters.ingredients.length > 0 && (
						<div
							className='recipe-filters__selected-ingredients'
							aria-label={t('recipes.filterIngredient')}>
							{filters.ingredients.map((ingredient) => (
								<span className='recipe-filters__selected-ingredient' key={ingredient.id}>
									{ingredient.name}
									<button
										type='button'
										onClick={() => removeIngredient(ingredient.id)}
										aria-label={`${t('remove')}: ${ingredient.name}`}>
										×
									</button>
								</span>
							))}
						</div>
					)}
				</div>
			</div>

			{/* ── Tags de ingredientes ── */}
			{availableTags.length > 0 && (
				<div className='recipe-filters__group recipe-filters__group--tags'>
					<label className='recipe-filters__label'>{t('recipes.filterTags')}</label>
					<TagMultiSelect
						tags={availableTags}
						includedIds={filters.tagIds}
						excludedIds={filters.excludeTagIds}
						searchPlaceholder={t('tags.searchPlaceholder')}
						onChange={(inc, exc) => updateImmediate({ tagIds: inc, excludeTagIds: exc })}
					/>
				</div>
			)}

			{/* ── Autor ── */}
			{authors.length > 0 && (
				<div className='recipe-filters__group recipe-filters__group--author'>
					<label className='recipe-filters__label'>{t('recipes.filterAuthor')}</label>
					<select
						className='form-input'
						value={filters.authorId ?? ''}
						onChange={(e) =>
							updateImmediate({ authorId: e.target.value ? Number(e.target.value) : null })
						}>
						<option value=''>{t('recipes.authorAll')}</option>
						{authors.map((a) => (
							<option key={a.id} value={a.id}>
								{a.name}
							</option>
						))}
					</select>
				</div>
			)}
		</div>
	)
}
