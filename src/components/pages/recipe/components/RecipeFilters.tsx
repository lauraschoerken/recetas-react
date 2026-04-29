import './RecipeFilters.scss'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface RecipeFilterValues {
	visibility: 'all' | 'mine' | 'public' | 'private'
	calories: string
	caloriesOp: 'lt' | 'gt'
	ingredient: string
}

interface RecipeFiltersProps {
	filters: RecipeFilterValues
	onChange: (filters: RecipeFilterValues) => void
	onClear: () => void
	activeCount: number
}

export const DEFAULT_FILTERS: RecipeFilterValues = {
	visibility: 'all',
	calories: '',
	caloriesOp: 'lt',
	ingredient: '',
}

export function RecipeFilters({ filters, onChange, onClear, activeCount }: RecipeFiltersProps) {
	const { t } = useTranslation()

	// Estado local para los campos de texto para no perder el foco mientras se escribe
	const [localIngredient, setLocalIngredient] = useState(filters.ingredient)
	const [localCalories, setLocalCalories] = useState(filters.calories)

	// Sincronizar desde fuera solo cuando se limpia externamente
	useEffect(() => {
		if (filters.ingredient === '') setLocalIngredient('')
	}, [filters.ingredient])
	useEffect(() => {
		if (filters.calories === '') setLocalCalories('')
	}, [filters.calories])

	// Debounce de 500ms para los campos de texto
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const scheduleChange = (patch: Partial<RecipeFilterValues>) => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			onChange({ ...filters, ...patch })
		}, 500)
	}

	// Visibilidad es inmediata (radio, no texto)
	const updateVisibility = (visibility: RecipeFilterValues['visibility']) => {
		onChange({ ...filters, ingredient: localIngredient, calories: localCalories, visibility })
	}

	// Operador de calorías es inmediato (toggle, no texto)
	const updateCaloriesOp = (caloriesOp: RecipeFilterValues['caloriesOp']) => {
		onChange({ ...filters, ingredient: localIngredient, calories: localCalories, caloriesOp })
	}

	return (
		<div className='recipe-filters'>
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
								onChange={() => updateVisibility(v)}
							/>
							{t(
								`recipes.filter${v.charAt(0).toUpperCase() + v.slice(1)}` as Parameters<typeof t>[0]
							)}
						</label>
					))}
				</div>
			</div>

			<div className='recipe-filters__group'>
				<label className='recipe-filters__label'>{t('recipes.filterCalories')}</label>
				<div className='recipe-filters__calories-row'>
					<div className='recipe-filters__radio-group'>
						<label
							className={`recipe-filters__radio${filters.caloriesOp === 'lt' ? ' active' : ''}`}>
							<input
								type='radio'
								name='caloriesOp'
								value='lt'
								checked={filters.caloriesOp === 'lt'}
								onChange={() => updateCaloriesOp('lt')}
							/>
							{t('recipes.filterCaloriesLt')}
						</label>
						<label
							className={`recipe-filters__radio${filters.caloriesOp === 'gt' ? ' active' : ''}`}>
							<input
								type='radio'
								name='caloriesOp'
								value='gt'
								checked={filters.caloriesOp === 'gt'}
								onChange={() => updateCaloriesOp('gt')}
							/>
							{t('recipes.filterCaloriesGt')}
						</label>
					</div>
					<input
						type='number'
						className='form-input recipe-filters__input'
						min={0}
						step={50}
						placeholder='kcal'
						value={localCalories}
						onChange={(e) => {
							setLocalCalories(e.target.value)
							scheduleChange({ calories: e.target.value, ingredient: localIngredient })
						}}
					/>
				</div>
			</div>

			<div className='recipe-filters__group'>
				<label className='recipe-filters__label'>{t('recipes.filterIngredient')}</label>
				<input
					type='text'
					className='form-input recipe-filters__input'
					placeholder={t('recipes.filterIngredientPlaceholder')}
					value={localIngredient}
					onChange={(e) => {
						setLocalIngredient(e.target.value)
						scheduleChange({ ingredient: e.target.value, calories: localCalories })
					}}
				/>
			</div>

			{activeCount > 0 && (
				<button type='button' className='btn btn-outline recipe-filters__clear' onClick={onClear}>
					{t('recipes.filterClear')}
				</button>
			)}
		</div>
	)
}
