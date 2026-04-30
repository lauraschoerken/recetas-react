import './IngredientListContainer.scss'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

import { Pagination } from '@/components/shared/pagination/Pagination'
import { alertService, IngredientThreshold } from '@/services/alert'
import { Ingredient, ingredientService, UpdateIngredientData } from '@/services/ingredient'
import { shoppingService } from '@/services/shopping'
import { storeService, UserStore } from '@/services/store'
import { useDialog } from '@/utils/dialog/DialogContext'
import { getStoredPageSize } from '@/utils/pagination/usePagination'

import { IngredientCard } from '../components/IngredientCard'
import { IngredientFormModal } from './IngredientFormModal'

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

	// Modales
	const [showCreateModal, setShowCreateModal] = useState(false)
	const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null)

	const search = searchParams.get('q') || ''
	const currentPage = parseInt(searchParams.get('page') || '1', 10)

	const [localSearch, setLocalSearch] = useState(search)
	const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	// Estado para añadir al plan semanal
	const [weekPlanIngredient, setWeekPlanIngredient] = useState<Ingredient | null>(null)
	const [weekPlanQty, setWeekPlanQty] = useState<number>(100)
	const [weekPlanUnit, setWeekPlanUnit] = useState<string>('g')
	const [weekPlanDate, setWeekPlanDate] = useState<string>(
		() => new Date().toISOString().split('T')[0]
	)
	const [addingToWeekPlan, setAddingToWeekPlan] = useState(false)

	const loadThresholds = useCallback(async () => {
		try {
			const thresholds = await alertService.getIngredientThresholds()
			setAllThresholds(thresholds)
		} catch (error) {
			console.error('Error loading thresholds:', error)
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
			})
			setIngredients(result.data)
			setTotal(result.total)
		} catch (error) {
			console.error('Error loading ingredients:', error)
		} finally {
			setLoading(false)
		}
	}, [currentPage, pageSize, search])

	useEffect(() => {
		loadIngredients()
	}, [loadIngredients])

	useEffect(() => {
		loadThresholds()
	}, [loadThresholds])

	useEffect(() => {
		loadStores()
	}, [loadStores])

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
				{
					ingredientId: ingredient.id,
					quantity: 1,
					unit: ingredient.unit,
				},
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

	useEffect(() => {
		setLocalSearch(search)
	}, [search])

	const handleSearchChange = (value: string) => {
		setLocalSearch(value)
		if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
		searchDebounceRef.current = setTimeout(() => {
			setSearchParams(
				(prev) => {
					const p = new URLSearchParams(prev)
					p.set('q', value)
					p.set('page', '1')
					return p
				},
				{ replace: true }
			)
		}, 300)
	}

	const handleSaved = async () => {
		await loadIngredients()
		await loadThresholds()
		await loadStores()
	}

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

			<div className='search-bar'>
				<input
					type='text'
					className='form-input search-input'
					placeholder={t('ingredients.searchPlaceholder')}
					value={localSearch}
					onChange={(e) => handleSearchChange(e.target.value)}
				/>
			</div>

			<div className='ingredient-stats'>
				<span>{t('ingredients.count', { count: total })}</span>
			</div>

			{loading ? (
				<div className='loading'>{t('ingredients.loading')}</div>
			) : total === 0 ? (
				<div className='empty-state'>
					<p>{t('ingredients.noResults')}</p>
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
