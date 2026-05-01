import './RecipeFilters.scss'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { TagMultiSelect } from '@/components/shared/tag-multi-select/TagMultiSelect'
import { IngredientTag } from '@/services/ingredientExtras'

export interface RecipeFilterValues {
	visibility: 'all' | 'mine' | 'public' | 'private'
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
	// Servidor
	difficulty: '' | 'easy' | 'medium' | 'hard'
	minCookTime: string
	maxCookTime: string
	ingredient: string
	tagIds: number[]
	excludeTagIds: number[]
	// Ordenación
	sortBy: 'createdAt' | 'title' | 'cookTimeMinutes' | 'difficulty'
	sortOrder: 'asc' | 'desc'
}

interface RecipeFiltersProps {
	filters: RecipeFilterValues
	availableTags: IngredientTag[]
	onChange: (filters: RecipeFilterValues) => void
	onClear: () => void
	activeCount: number
}

export const DEFAULT_FILTERS: RecipeFilterValues = {
	visibility: 'all',
	minCalories: '',
	maxCalories: '',
	minProtein: '',
	maxProtein: '',
	minCarbs: '',
	maxCarbs: '',
	minFat: '',
	maxFat: '',
	difficulty: '',
	minCookTime: '',
	maxCookTime: '',
	ingredient: '',
	tagIds: [],
	excludeTagIds: [],
	sortBy: 'createdAt',
	sortOrder: 'desc',
}

export function RecipeFilters({
	filters,
	availableTags,
	onChange,
	onClear,
	activeCount,
}: RecipeFiltersProps) {
	const { t } = useTranslation()

	// Estado local para inputs de texto (debounce)
	const [localIngredient, setLocalIngredient] = useState(filters.ingredient)
	const [localMinCal, setLocalMinCal] = useState(filters.minCalories)
	const [localMaxCal, setLocalMaxCal] = useState(filters.maxCalories)
	const [localMinProt, setLocalMinProt] = useState(filters.minProtein)
	const [localMaxProt, setLocalMaxProt] = useState(filters.maxProtein)
	const [localMinCarbs, setLocalMinCarbs] = useState(filters.minCarbs)
	const [localMaxCarbs, setLocalMaxCarbs] = useState(filters.maxCarbs)
	const [localMinFat, setLocalMinFat] = useState(filters.minFat)
	const [localMaxFat, setLocalMaxFat] = useState(filters.maxFat)
	const [localMinCook, setLocalMinCook] = useState(filters.minCookTime)
	const [localMaxCook, setLocalMaxCook] = useState(filters.maxCookTime)

	// Sincronizar cuando se limpia externamente
	useEffect(() => {
		if (filters.ingredient === '') setLocalIngredient('')
		if (filters.minCalories === '') setLocalMinCal('')
		if (filters.maxCalories === '') setLocalMaxCal('')
		if (filters.minProtein === '') setLocalMinProt('')
		if (filters.maxProtein === '') setLocalMaxProt('')
		if (filters.minCarbs === '') setLocalMinCarbs('')
		if (filters.maxCarbs === '') setLocalMaxCarbs('')
		if (filters.minFat === '') setLocalMinFat('')
		if (filters.maxFat === '') setLocalMaxFat('')
		if (filters.minCookTime === '') setLocalMinCook('')
		if (filters.maxCookTime === '') setLocalMaxCook('')
	}, [filters])

	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const scheduleChange = (patch: Partial<RecipeFilterValues>) => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			onChange({
				...filters,
				ingredient: localIngredient,
				minCalories: localMinCal,
				maxCalories: localMaxCal,
				minProtein: localMinProt,
				maxProtein: localMaxProt,
				minCarbs: localMinCarbs,
				maxCarbs: localMaxCarbs,
				minFat: localMinFat,
				maxFat: localMaxFat,
				minCookTime: localMinCook,
				maxCookTime: localMaxCook,
				...patch,
			})
		}, 500)
	}

	const updateImmediate = (patch: Partial<RecipeFilterValues>) => {
		onChange({
			...filters,
			ingredient: localIngredient,
			minCalories: localMinCal,
			maxCalories: localMaxCal,
			minProtein: localMinProt,
			maxProtein: localMaxProt,
			minCarbs: localMinCarbs,
			maxCarbs: localMaxCarbs,
			minFat: localMinFat,
			maxFat: localMaxFat,
			minCookTime: localMinCook,
			maxCookTime: localMaxCook,
			...patch,
		})
	}

	const toggleTag = (tagId: number) => {
		const inInclude = filters.tagIds.includes(tagId)
		const inExclude = filters.excludeTagIds.includes(tagId)
		if (!inInclude && !inExclude) {
			updateImmediate({
				tagIds: [...filters.tagIds, tagId],
				excludeTagIds: filters.excludeTagIds.filter((id) => id !== tagId),
			})
		} else if (inInclude) {
			updateImmediate({
				tagIds: filters.tagIds.filter((id) => id !== tagId),
				excludeTagIds: [...filters.excludeTagIds, tagId],
			})
		} else {
			updateImmediate({
				tagIds: filters.tagIds.filter((id) => id !== tagId),
				excludeTagIds: filters.excludeTagIds.filter((id) => id !== tagId),
			})
		}
	}

	return (
		<div className='recipe-filters'>
			{/* ── Ordenación ── */}
			<div className='recipe-filters__group'>
				<label className='recipe-filters__label'>{t('recipes.sortBy')}</label>
				<div className='recipe-filters__row'>
					<select
						className='form-input recipe-filters__select'
						value={filters.sortBy}
						onChange={(e) =>
							updateImmediate({ sortBy: e.target.value as RecipeFilterValues['sortBy'] })
						}>
						<option value='createdAt'>{t('recipes.sortCreatedAt')}</option>
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
			<div className='recipe-filters__group'>
				<label className='recipe-filters__label'>{t('recipes.filterVisibility')}</label>
				<div className='recipe-filters__radio-group'>
					{(['all', 'mine', 'public', 'private'] as const).map((v) => (
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
								`recipes.filter${v.charAt(0).toUpperCase() + v.slice(1)}` as Parameters<typeof t>[0]
							)}
						</label>
					))}
				</div>
			</div>

			{/* ── Dificultad ── */}
			<div className='recipe-filters__group'>
				<label className='recipe-filters__label'>{t('recipes.difficultyLabel')}</label>
				<div className='recipe-filters__radio-group'>
					{(['', 'easy', 'medium', 'hard'] as const).map((d) => (
						<label
							key={d}
							className={`recipe-filters__radio${filters.difficulty === d ? ' active' : ''}`}>
							<input
								type='radio'
								name='difficulty'
								value={d}
								checked={filters.difficulty === d}
								onChange={() => updateImmediate({ difficulty: d })}
							/>
							{d === ''
								? t('recipes.filterAll')
								: t(
										`recipes.difficulty${d.charAt(0).toUpperCase() + d.slice(1)}` as Parameters<
											typeof t
										>[0]
									)}
						</label>
					))}
				</div>
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
				<label className='recipe-filters__label'>{t('recipes.filterIngredient')}</label>
				<input
					type='text'
					className='form-input recipe-filters__input'
					placeholder={t('recipes.filterIngredientPlaceholder')}
					value={localIngredient}
					onChange={(e) => {
						setLocalIngredient(e.target.value)
						scheduleChange({ ingredient: e.target.value })
					}}
				/>
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

			{activeCount > 0 && (
				<button type='button' className='btn btn-outline recipe-filters__clear' onClick={onClear}>
					{t('recipes.filterClear')}
				</button>
			)}
		</div>
	)
}
