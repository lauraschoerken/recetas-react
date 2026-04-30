import './IngredientListContainer.scss'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

import { Pagination } from '@/components/shared/pagination/Pagination'
import { alertService, IngredientThreshold } from '@/services/alert'
import { Ingredient, ingredientService, UpdateIngredientData } from '@/services/ingredient'
import { IngredientTag, ingredientTagService } from '@/services/ingredientExtras'
import { shoppingService } from '@/services/shopping'
import { storeService, UserStore } from '@/services/store'
import { useDialog } from '@/utils/dialog/DialogContext'
import { getStoredPageSize } from '@/utils/pagination/usePagination'

import { IngredientCard } from '../components/IngredientCard'
import { IngredientFormModal } from './IngredientFormModal'

// Opciones de ordenación disponibles
const SORT_OPTIONS = ['name', 'calories', 'protein', 'carbs', 'fat', 'fiber'] as const
type SortField = (typeof SORT_OPTIONS)[number]

export function IngredientListContainer() {
	const { t } = useTranslation()
	const { confirm, toast } = useDialog()
	const [ingredients, setIngredients] = useState<Ingredient[]>([])
	const [allThresholds, setAllThresholds] = useState<IngredientThreshold[]>([])
	const [loading, setLoading] = useState(true)
	const [total, setTotal] = useState(0)
	const [searchParams, setSearchParams] = useSearchParams()
	const [pageSize] = useState(getStoredPageSize)
	const [stores, setStores] = useState<UserStore[]>([])
	const [filtersOpen, setFiltersOpen] = useState(false)
	const [availableTags, setAvailableTags] = useState<IngredientTag[]>([])

	// Modales
	const [showCreateModal, setShowCreateModal] = useState(false)
	const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null)

	// Plan semanal
	const [weekPlanIngredient, setWeekPlanIngredient] = useState<Ingredient | null>(null)
	const [weekPlanQty, setWeekPlanQty] = useState<number>(100)
	const [weekPlanUnit, setWeekPlanUnit] = useState<string>('g')
	const [weekPlanDate, setWeekPlanDate] = useState<string>(
		() => new Date().toISOString().split('T')[0]
	)
	const [addingToWeekPlan, setAddingToWeekPlan] = useState(false)

	// ── Leer filtros desde URL params ──
	const search = searchParams.get('q') || ''
	const currentPage = parseInt(searchParams.get('page') || '1', 10)
	const sortBy = (searchParams.get('sortBy') || 'name') as SortField
	const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc'
	const filterLocation = searchParams.get('loc') || ''
	const filterStatus = searchParams.get('status') || ''
	const filterHasNutrition = searchParams.get('hasNutr') === 'true'
	const filterMinCal = searchParams.get('minCal') ? Number(searchParams.get('minCal')) : undefined
	const filterMaxCal = searchParams.get('maxCal') ? Number(searchParams.get('maxCal')) : undefined
	const filterMinProt = searchParams.get('minProt')
		? Number(searchParams.get('minProt'))
		: undefined
	const filterMaxProt = searchParams.get('maxProt')
		? Number(searchParams.get('maxProt'))
		: undefined
	const filterMinCarbs = searchParams.get('minCarbs')
		? Number(searchParams.get('minCarbs'))
		: undefined
	const filterMaxCarbs = searchParams.get('maxCarbs')
		? Number(searchParams.get('maxCarbs'))
		: undefined
	const filterMinFat = searchParams.get('minFat') ? Number(searchParams.get('minFat')) : undefined
	const filterMaxFat = searchParams.get('maxFat') ? Number(searchParams.get('maxFat')) : undefined
	const filterTagIds = searchParams.get('tags')
		? searchParams
				.get('tags')!
				.split(',')
				.map(Number)
				.filter((n) => !isNaN(n) && n > 0)
		: []

	// Estado local para inputs de texto/búsqueda (debounced)
	const [localSearch, setLocalSearch] = useState(search)
	const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	// Inputs locales para rangos numéricos (para evitar recargas en cada tecla)
	const [localMinCal, setLocalMinCal] = useState(searchParams.get('minCal') || '')
	const [localMaxCal, setLocalMaxCal] = useState(searchParams.get('maxCal') || '')
	const [localMinProt, setLocalMinProt] = useState(searchParams.get('minProt') || '')
	const [localMaxProt, setLocalMaxProt] = useState(searchParams.get('maxProt') || '')
	const [localMinCarbs, setLocalMinCarbs] = useState(searchParams.get('minCarbs') || '')
	const [localMaxCarbs, setLocalMaxCarbs] = useState(searchParams.get('maxCarbs') || '')
	const [localMinFat, setLocalMinFat] = useState(searchParams.get('minFat') || '')
	const [localMaxFat, setLocalMaxFat] = useState(searchParams.get('maxFat') || '')
	const numericDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	// ── Calcular cuántos filtros activos hay (excluyendo búsqueda y orden) ──
	const activeFilterCount = [
		filterLocation,
		filterStatus,
		filterHasNutrition,
		filterMinCal != null,
		filterMaxCal != null,
		filterMinProt != null,
		filterMaxProt != null,
		filterMinCarbs != null,
		filterMaxCarbs != null,
		filterMinFat != null,
		filterMaxFat != null,
		filterTagIds.length > 0,
	].filter(Boolean).length

	const loadThresholds = useCallback(async () => {
		try {
			const thresholds = await alertService.getIngredientThresholds()
			setAllThresholds(thresholds)
		} catch (error) {
			console.error('Error loading thresholds:', error)
		}
	}, [])

	const loadTags = useCallback(async () => {
		try {
			const tags = await ingredientTagService.getAll()
			setAvailableTags(tags)
		} catch (error) {
			console.error('Error loading tags:', error)
		}
	}, [])

	const loadStores = useCallback(async () => {
		try {
			const s = await storeService.getAll()
			setStores(s)
		} catch (error) {
			console.error('Error loading stores:', error)
		}
	}, [])

	const loadIngredients = useCallback(async () => {
		setLoading(true)
		try {
			const result = await ingredientService.getAllPaginated({
				page: currentPage,
				pageSize,
				search,
				sortBy,
				sortOrder,
				location: filterLocation || undefined,
				statusFilter: filterStatus || undefined,
				hasNutrition: filterHasNutrition || undefined,
				minCalories: filterMinCal,
				maxCalories: filterMaxCal,
				minProtein: filterMinProt,
				maxProtein: filterMaxProt,
				minCarbs: filterMinCarbs,
				maxCarbs: filterMaxCarbs,
				minFat: filterMinFat,
				maxFat: filterMaxFat,
				tagIds: filterTagIds.length > 0 ? filterTagIds : undefined,
			})
			setIngredients(result.data)
			setTotal(result.total)
		} catch (error) {
			console.error('Error loading ingredients:', error)
		} finally {
			setLoading(false)
		}
	}, [
		currentPage,
		pageSize,
		search,
		sortBy,
		sortOrder,
		filterLocation,
		filterStatus,
		filterHasNutrition,
		filterMinCal,
		filterMaxCal,
		filterMinProt,
		filterMaxProt,
		filterMinCarbs,
		filterMaxCarbs,
		filterMinFat,
		filterMaxFat,
		// eslint-disable-next-line react-hooks/exhaustive-deps
		searchParams.get('tags'),
	])

	useEffect(() => {
		loadIngredients()
	}, [loadIngredients])

	useEffect(() => {
		loadThresholds()
	}, [loadThresholds])

	useEffect(() => {
		loadStores()
	}, [loadStores])

	useEffect(() => {
		loadTags()
	}, [loadTags])

	// Sincronizar localSearch con URL
	useEffect(() => {
		setLocalSearch(search)
	}, [search])

	// ── Helpers para actualizar URL params ──
	const updateParam = (key: string, value: string | null) => {
		setSearchParams(
			(prev) => {
				const p = new URLSearchParams(prev)
				if (value) p.set(key, value)
				else p.delete(key)
				p.set('page', '1')
				return p
			},
			{ replace: true }
		)
	}

	const handleSearchChange = (value: string) => {
		setLocalSearch(value)
		if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
		searchDebounceRef.current = setTimeout(() => {
			updateParam('q', value || null)
		}, 300)
	}

	const handleSortBy = (field: SortField) => {
		setSearchParams(
			(prev) => {
				const p = new URLSearchParams(prev)
				if (p.get('sortBy') === field) {
					// Invertir orden si se pulsa el mismo campo
					p.set('sortOrder', p.get('sortOrder') === 'asc' ? 'desc' : 'asc')
				} else {
					p.set('sortBy', field)
					p.set('sortOrder', field === 'name' ? 'asc' : 'desc')
				}
				p.set('page', '1')
				return p
			},
			{ replace: true }
		)
	}

	const handleSortOrderToggle = () => {
		updateParam('sortOrder', sortOrder === 'asc' ? 'desc' : 'asc')
	}

	// Debounce para campos numéricos: actualiza URL solo después de 600ms sin escribir
	const scheduleNumericUpdate = (updates: Record<string, string>) => {
		if (numericDebounceRef.current) clearTimeout(numericDebounceRef.current)
		numericDebounceRef.current = setTimeout(() => {
			setSearchParams(
				(prev) => {
					const p = new URLSearchParams(prev)
					for (const [key, val] of Object.entries(updates)) {
						if (val) p.set(key, val)
						else p.delete(key)
					}
					p.set('page', '1')
					return p
				},
				{ replace: true }
			)
		}, 600)
	}

	const handleClearFilters = () => {
		setLocalMinCal('')
		setLocalMaxCal('')
		setLocalMinProt('')
		setLocalMaxProt('')
		setLocalMinCarbs('')
		setLocalMaxCarbs('')
		setLocalMinFat('')
		setLocalMaxFat('')
		setSearchParams(
			(prev) => {
				const p = new URLSearchParams(prev)
				;[
					'loc',
					'status',
					'hasNutr',
					'minCal',
					'maxCal',
					'minProt',
					'maxProt',
					'minCarbs',
					'maxCarbs',
					'minFat',
					'maxFat',
					'tags',
				].forEach((k) => p.delete(k))
				p.set('page', '1')
				return p
			},
			{ replace: true }
		)
	}

	const handleTagToggle = (tagId: number) => {
		const current = filterTagIds
		const next = current.includes(tagId)
			? current.filter((id) => id !== tagId)
			: [...current, tagId]
		setSearchParams(
			(prev) => {
				const p = new URLSearchParams(prev)
				if (next.length > 0) p.set('tags', next.join(','))
				else p.delete('tags')
				p.set('page', '1')
				return p
			},
			{ replace: true }
		)
	}

	const handleUpdate = async (id: number, data: UpdateIngredientData) => {
		try {
			await ingredientService.update(id, data)
			await loadIngredients()
			toast.success(t('ingredients.updated'))
		} catch (error) {
			toast.error(t('ingredients.updateError'))
		}
	}

	const handleDelete = async (id: number) => {
		const confirmed = await confirm({
			title: t('ingredients.deleteTitle'),
			message: t('ingredients.deleteConfirm'),
			confirmText: t('delete'),
			type: 'danger',
		})
		if (!confirmed) return

		try {
			await ingredientService.delete(id)
			setIngredients((prev) => prev.filter((ing) => ing.id !== id))
			setTotal((prev) => prev - 1)
			toast.success(t('ingredients.deleted'))
		} catch (error) {
			toast.error(t('ingredients.deleteError'))
		}
	}

	const handleAddToShopping = async (ingredient: Ingredient) => {
		try {
			await shoppingService.addManualItems([
				{ ingredientId: ingredient.id, quantity: 1, unit: ingredient.unit },
			])
			toast.success(t('ingredients.addedToShopping'))
		} catch {
			toast.error(t('ingredients.addToShoppingError'))
		}
	}

	const handleOpenAddToWeekPlan = (ingredient: Ingredient) => {
		setWeekPlanIngredient(ingredient)
		setWeekPlanQty(100)
		setWeekPlanUnit(ingredient.unit)
		setWeekPlanDate(new Date().toISOString().split('T')[0])
	}

	const handleAddToWeekPlan = async () => {
		if (!weekPlanIngredient || weekPlanQty <= 0) return
		setAddingToWeekPlan(true)
		try {
			await shoppingService.addToWeekPlan({
				ingredientId: weekPlanIngredient.id,
				ingredientQty: weekPlanQty,
				ingredientUnit: weekPlanUnit,
				plannedDate: weekPlanDate,
			})
			toast.success(t('ingredients.addedToWeekPlan'))
			setWeekPlanIngredient(null)
		} catch {
			toast.error(t('ingredients.addToWeekPlanError'))
		} finally {
			setAddingToWeekPlan(false)
		}
	}

	const handleSaved = async () => {
		await loadIngredients()
		await loadThresholds()
		await loadStores()
	}

	// Iconos de flecha según orden
	const sortArrow = sortOrder === 'asc' ? '↑' : '↓'

	return (
		<div className='ingredient-list-container'>
			<div className='page-header'>
				<h1 className='page-title'>{t('ingredients.title')}</h1>
				<button className='btn btn-primary' onClick={() => setShowCreateModal(true)}>
					{t('ingredients.new')}
				</button>
			</div>

			{/* Modal creacion */}
			<IngredientFormModal
				isOpen={showCreateModal}
				onClose={() => setShowCreateModal(false)}
				onSaved={handleSaved}
			/>

			{/* Modal edicion */}
			<IngredientFormModal
				isOpen={!!editingIngredient}
				onClose={() => setEditingIngredient(null)}
				onSaved={handleSaved}
				ingredient={editingIngredient}
				autoSaveOnClose
				thresholdData={
					editingIngredient
						? (allThresholds.find((th) => th.ingredientId === editingIngredient.id) ?? null)
						: null
				}
			/>

			{/* ── Barra de búsqueda + controles ── */}
			<div className='search-and-controls'>
				<input
					type='text'
					className='form-input search-input'
					placeholder={t('ingredients.searchPlaceholder')}
					value={localSearch}
					onChange={(e) => handleSearchChange(e.target.value)}
				/>

				{/* Ordenar por (pills rápidas) */}
				<div className='sort-pills'>
					{SORT_OPTIONS.map((field) => (
						<button
							key={field}
							className={`sort-pill${sortBy === field ? ' active' : ''}`}
							onClick={() => handleSortBy(field)}>
							{t(`ingredients.sortBy.${field}`)}
							{sortBy === field && <span className='sort-arrow'>{sortArrow}</span>}
						</button>
					))}
					{sortBy !== 'name' && sortBy === sortBy && (
						<button
							className='sort-pill sort-pill--order'
							onClick={handleSortOrderToggle}
							title={t('ingredients.sortOrderToggle')}>
							{sortArrow}
						</button>
					)}
				</div>

				{/* Botón de filtros avanzados */}
				<button
					className={`btn btn-outline filter-toggle-btn${filtersOpen ? ' active' : ''}`}
					onClick={() => setFiltersOpen((o) => !o)}>
					{t('ingredients.filters')}
					{activeFilterCount > 0 && <span className='filter-badge'>{activeFilterCount}</span>}
				</button>
			</div>

			{/* ── Panel de filtros avanzados ── */}
			{filtersOpen && (
				<div className='filter-panel'>
					<div className='filter-grid'>
						{/* Ubicación */}
						<div className='filter-group'>
							<label className='filter-label'>{t('ingredients.filterLocation')}</label>
							<select
								className='form-input'
								value={filterLocation}
								onChange={(e) => updateParam('loc', e.target.value || null)}>
								<option value=''>{t('ingredients.filterAll')}</option>
								<option value='nevera'>{t('homePage.fridge')}</option>
								<option value='congelador'>{t('homePage.freezer')}</option>
								<option value='despensa'>{t('homePage.pantry')}</option>
							</select>
						</div>

						{/* Visibilidad */}
						<div className='filter-group'>
							<label className='filter-label'>{t('ingredients.filterVisibility')}</label>
							<select
								className='form-input'
								value={filterStatus}
								onChange={(e) => updateParam('status', e.target.value || null)}>
								<option value=''>{t('ingredients.filterAll')}</option>
								<option value='GLOBAL'>{t('ingredients.filterGlobal')}</option>
								<option value='PRIVATE'>{t('ingredients.filterPrivate')}</option>
								<option value='PENDING'>{t('ingredients.filterPending')}</option>
							</select>
						</div>

						{/* Tiene macros */}
						<div className='filter-group filter-group--check'>
							<label className='filter-check-label'>
								<input
									type='checkbox'
									checked={filterHasNutrition}
									onChange={(e) => updateParam('hasNutr', e.target.checked ? 'true' : null)}
								/>
								{t('ingredients.filterHasNutrition')}
							</label>
						</div>

						{/* Calorías */}
						<div className='filter-group filter-group--range'>
							<label className='filter-label'>
								{t('ingredients.filterCalories')} (kcal/100
								{t('ingredients.filterPer100g')})
							</label>
							<div className='filter-range-inputs'>
								<input
									type='number'
									className='form-input'
									placeholder={t('ingredients.filterMin')}
									min={0}
									value={localMinCal}
									onChange={(e) => {
										setLocalMinCal(e.target.value)
										scheduleNumericUpdate({
											minCal: e.target.value,
											maxCal: localMaxCal,
										})
									}}
								/>
								<span className='filter-range-sep'>–</span>
								<input
									type='number'
									className='form-input'
									placeholder={t('ingredients.filterMax')}
									min={0}
									value={localMaxCal}
									onChange={(e) => {
										setLocalMaxCal(e.target.value)
										scheduleNumericUpdate({
											minCal: localMinCal,
											maxCal: e.target.value,
										})
									}}
								/>
							</div>
						</div>

						{/* Proteínas */}
						<div className='filter-group filter-group--range'>
							<label className='filter-label'>
								{t('ingredients.filterProtein')} (g/100
								{t('ingredients.filterPer100g')})
							</label>
							<div className='filter-range-inputs'>
								<input
									type='number'
									className='form-input'
									placeholder={t('ingredients.filterMin')}
									min={0}
									value={localMinProt}
									onChange={(e) => {
										setLocalMinProt(e.target.value)
										scheduleNumericUpdate({
											minProt: e.target.value,
											maxProt: localMaxProt,
										})
									}}
								/>
								<span className='filter-range-sep'>–</span>
								<input
									type='number'
									className='form-input'
									placeholder={t('ingredients.filterMax')}
									min={0}
									value={localMaxProt}
									onChange={(e) => {
										setLocalMaxProt(e.target.value)
										scheduleNumericUpdate({
											minProt: localMinProt,
											maxProt: e.target.value,
										})
									}}
								/>
							</div>
						</div>

						{/* Hidratos */}
						<div className='filter-group filter-group--range'>
							<label className='filter-label'>
								{t('ingredients.filterCarbs')} (g/100
								{t('ingredients.filterPer100g')})
							</label>
							<div className='filter-range-inputs'>
								<input
									type='number'
									className='form-input'
									placeholder={t('ingredients.filterMin')}
									min={0}
									value={localMinCarbs}
									onChange={(e) => {
										setLocalMinCarbs(e.target.value)
										scheduleNumericUpdate({
											minCarbs: e.target.value,
											maxCarbs: localMaxCarbs,
										})
									}}
								/>
								<span className='filter-range-sep'>–</span>
								<input
									type='number'
									className='form-input'
									placeholder={t('ingredients.filterMax')}
									min={0}
									value={localMaxCarbs}
									onChange={(e) => {
										setLocalMaxCarbs(e.target.value)
										scheduleNumericUpdate({
											minCarbs: localMinCarbs,
											maxCarbs: e.target.value,
										})
									}}
								/>
							</div>
						</div>

						{/* Grasas */}
						<div className='filter-group filter-group--range'>
							<label className='filter-label'>
								{t('ingredients.filterFat')} (g/100
								{t('ingredients.filterPer100g')})
							</label>
							<div className='filter-range-inputs'>
								<input
									type='number'
									className='form-input'
									placeholder={t('ingredients.filterMin')}
									min={0}
									value={localMinFat}
									onChange={(e) => {
										setLocalMinFat(e.target.value)
										scheduleNumericUpdate({
											minFat: e.target.value,
											maxFat: localMaxFat,
										})
									}}
								/>
								<span className='filter-range-sep'>–</span>
								<input
									type='number'
									className='form-input'
									placeholder={t('ingredients.filterMax')}
									min={0}
									value={localMaxFat}
									onChange={(e) => {
										setLocalMaxFat(e.target.value)
										scheduleNumericUpdate({
											minFat: localMinFat,
											maxFat: e.target.value,
										})
									}}
								/>
							</div>
						</div>

						{/* Tags */}
						{availableTags.length > 0 && (
							<div className='filter-group filter-group--tags filter-group--full'>
								<label className='filter-label'>{t('ingredients.filterTags')}</label>
								<div className='filter-tags-list'>
									{availableTags.map((tag) => {
										const active = filterTagIds.includes(tag.id)
										return (
											<button
												key={tag.id}
												className={`filter-tag-pill${active ? ' active' : ''}`}
												style={
													tag.color
														? ({ '--tag-color': tag.color } as React.CSSProperties)
														: undefined
												}
												onClick={() => handleTagToggle(tag.id)}>
												{tag.name}
											</button>
										)
									})}
								</div>
							</div>
						)}
					</div>

					{activeFilterCount > 0 && (
						<div className='filter-actions'>
							<button className='btn btn-outline btn-sm' onClick={handleClearFilters}>
								{t('ingredients.filterClear')} ({activeFilterCount})
							</button>
						</div>
					)}
				</div>
			)}

			<div className='ingredient-stats'>
				<span>{t('ingredients.count', { count: total })}</span>
				{(sortBy !== 'name' || sortOrder !== 'asc') && (
					<span className='stats-sort-hint'>
						· {t(`ingredients.sortBy.${sortBy}`)} {sortArrow}
					</span>
				)}
			</div>

			{loading ? (
				<div className='loading'>{t('ingredients.loading')}</div>
			) : total === 0 ? (
				<div className='empty-state'>
					<p>{t('ingredients.noResults')}</p>
					{activeFilterCount > 0 && (
						<button className='btn btn-outline btn-sm' onClick={handleClearFilters}>
							{t('ingredients.filterClear')}
						</button>
					)}
				</div>
			) : (
				<>
					<div className='ingredients-grid'>
						{ingredients.map((ingredient) => (
							<IngredientCard
								key={ingredient.id}
								ingredient={ingredient}
								thresholdData={
									allThresholds.find((th) => th.ingredientId === ingredient.id) ?? null
								}
								stores={stores
									.filter((s) => s.ingredients?.some((si) => si.ingredientId === ingredient.id))
									.sort((a, b) => {
										const aOrd = a.ingredients?.find(
											(si) => si.ingredientId === ingredient.id
										)?.sortOrder
										const bOrd = b.ingredients?.find(
											(si) => si.ingredientId === ingredient.id
										)?.sortOrder
										if (aOrd == null && bOrd == null) return 0
										if (aOrd == null) return 1
										if (bOrd == null) return -1
										return aOrd - bOrd
									})}
								onUpdate={handleUpdate}
								onDelete={handleDelete}
								onEdit={setEditingIngredient}
								onConversionChange={loadIngredients}
								onThresholdChange={loadThresholds}
								onAddToShopping={handleAddToShopping}
								onAddToWeekPlan={handleOpenAddToWeekPlan}
							/>
						))}
					</div>
					<Pagination
						currentPage={currentPage}
						total={total}
						pageSize={pageSize}
						onPageChange={(p) =>
							setSearchParams(
								(prev) => {
									const n = new URLSearchParams(prev)
									n.set('page', String(p))
									return n
								},
								{ replace: true }
							)
						}
					/>
				</>
			)}

			{weekPlanIngredient && (
				<div className='modal-overlay' onClick={() => setWeekPlanIngredient(null)}>
					<div className='modal-card' onClick={(e) => e.stopPropagation()}>
						<h3>{t('ingredients.addToWeekPlanTitle', { name: weekPlanIngredient.name })}</h3>

						<div className='form-group'>
							<label>{t('weekPlan.dateLabel')}</label>
							<input
								type='date'
								value={weekPlanDate}
								onChange={(e) => setWeekPlanDate(e.target.value)}
							/>
						</div>

						<div className='form-row'>
							<div className='form-group'>
								<label>{t('ingredients.quantityPlaceholder')}</label>
								<input
									type='number'
									min='0'
									step='any'
									value={weekPlanQty}
									onChange={(e) => setWeekPlanQty(parseFloat(e.target.value) || 0)}
								/>
							</div>
							<div className='form-group'>
								<label>{t('ingredients.unitHeader')}</label>
								<select value={weekPlanUnit} onChange={(e) => setWeekPlanUnit(e.target.value)}>
									<option value={weekPlanIngredient.unit}>{weekPlanIngredient.unit}</option>
									{weekPlanIngredient.unit === 'g' && <option value='kg'>kg</option>}
									{weekPlanIngredient.unit === 'ml' && <option value='l'>l</option>}
									{(weekPlanIngredient.conversions || []).map((c) => (
										<option key={c.id} value={c.unitName}>
											{c.unitName}
										</option>
									))}
								</select>
							</div>
						</div>

						<div className='modal-actions'>
							<button className='btn btn-outline' onClick={() => setWeekPlanIngredient(null)}>
								{t('cancel')}
							</button>
							<button
								className='btn btn-primary'
								disabled={weekPlanQty <= 0 || addingToWeekPlan}
								onClick={handleAddToWeekPlan}>
								{addingToWeekPlan ? t('weekPlan.adding') : t('weekPlan.addBtn')}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
