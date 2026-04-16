import './HomeContainer.scss'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { CreateHomeItemData, HomeItem, HomeLocation, homeService } from '@/services/home'
import { shoppingService } from '@/services/shopping'
import { useDialog } from '@/utils/dialog/DialogContext'
import { getStoredPageSize, paginate } from '@/utils/pagination/usePagination'

import { AddHomeItemForm } from '../components/AddHomeItemForm'
import { HomeItemCard } from '../components/HomeItemCard'
import { Pagination } from '@/components/shared/pagination/Pagination'

export function HomeContainer() {
	const { t } = useTranslation()
	const { confirm, toast } = useDialog()

	const LOCATIONS: { id: HomeLocation; label: string; icon: string }[] = [
		{ id: 'nevera', label: t('homePage.fridge'), icon: '❄️' },
		{ id: 'congelador', label: t('homePage.freezer'), icon: '🧊' },
		{ id: 'despensa', label: t('homePage.pantry'), icon: '🏠' },
	]
	const [items, setItems] = useState<HomeItem[]>([])
	const [loading, setLoading] = useState(true)
	const [searchParams, setSearchParams] = useSearchParams()
	const [showAddForm, setShowAddForm] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')
	const [pageSize] = useState(getStoredPageSize)

	const activeTab = (searchParams.get('tab') as HomeLocation) ?? 'nevera'
	const currentPage = parseInt(searchParams.get('page') || '1', 10)

	useEffect(() => {
		initializeHome()
	}, [])

	const initializeHome = async () => {
		try {
			const data = await homeService.getAll()
			setItems(data)
		} catch (error) {
			console.error('Error loading home items:', error)
		} finally {
			setLoading(false)
		}
	}

	const loadItems = async () => {
		try {
			const data = await homeService.getAll()
			setItems(data)
		} catch (error) {
			console.error('Error loading home items:', error)
		}
	}

	const handleAdd = async (data: CreateHomeItemData) => {
		try {
			await homeService.create(data)
			await loadItems()
			setShowAddForm(false)
			toast.success(t('homePage.itemAdded'))
		} catch (error) {
			toast.error(t('homePage.addError'))
		}
	}

	const handleUpdate = async (id: number, data: { quantity?: number; location?: HomeLocation }) => {
		try {
			await homeService.update(id, data)
			await loadItems()
		} catch (error) {
			toast.error(t('homePage.updateError'))
		}
	}

	const handleDelete = async (id: number) => {
		const confirmed = await confirm({
			title: t('homePage.deleteTitle'),
			message: t('homePage.deleteConfirm'),
			confirmText: t('delete'),
			type: 'danger',
		})
		if (!confirmed) return

		try {
			await homeService.delete(id)
			setItems(items.filter((item) => item.id !== id))
			toast.success(t('homePage.deleted'))
		} catch (error) {
			toast.error(t('homePage.deleteError'))
		}
	}

	const handleCook = async (_id: number, result: { success: boolean; message: string }) => {
		if (result.success) {
			toast.success(result.message)
			await loadItems()
		} else {
			toast.error(t('homePage.cookError'))
		}
	}

	// ── Weekplan modal ──
	const [weekPlanItem, setWeekPlanItem] = useState<HomeItem | null>(null)
	const [wpDate, setWpDate] = useState(() => new Date().toISOString().slice(0, 10))
	const [wpQty, setWpQty] = useState(1)
	const [wpUnit, setWpUnit] = useState('g')
	const [wpServings, setWpServings] = useState(1)
	const [wpAdding, setWpAdding] = useState(false)

	const handleOpenWeekPlan = (item: HomeItem) => {
		setWeekPlanItem(item)
		setWpDate(new Date().toISOString().slice(0, 10))
		if (item.ingredient) {
			setWpQty(item.quantity)
			setWpUnit(item.unit)
		} else {
			setWpServings(item.quantity)
		}
	}

	const handleAddToWeekPlan = async () => {
		if (!weekPlanItem) return
		setWpAdding(true)
		try {
			if (weekPlanItem.ingredient) {
				await shoppingService.addToWeekPlan({
					ingredientId: weekPlanItem.ingredientId!,
					ingredientQty: wpQty,
					ingredientUnit: wpUnit,
					plannedDate: wpDate,
				})
			} else if (weekPlanItem.recipe) {
				await shoppingService.addToWeekPlan({
					recipeId: weekPlanItem.recipe.id,
					plannedDate: wpDate,
					servings: wpServings,
				})
			}
			toast.success(t('homePage.addedToWeekPlan'))
			setWeekPlanItem(null)
		} catch {
			toast.error(t('homePage.addToWeekPlanError'))
		} finally {
			setWpAdding(false)
		}
	}

	const filteredItems = items
		.filter((item) => item.location === activeTab)
		.filter((item) => {
			if (!searchQuery.trim()) return true
			const q = searchQuery.toLowerCase()
			const name = (item.recipe?.title || item.ingredient?.name || '').toLowerCase()
			return name.includes(q)
		})
	const visibleItems = paginate(filteredItems, currentPage, pageSize)

	const searchAllLocations = (query: string) => {
		if (!query.trim()) return []
		const q = query.toLowerCase()
		return items.filter((item) => {
			const name = (item.recipe?.title || item.ingredient?.name || '').toLowerCase()
			return name.includes(q)
		})
	}

	const crossSectionResults = searchAllLocations(searchQuery)

	const getLocationCount = (location: HomeLocation) => {
		const locationItems = items.filter((item) => item.location === location)
		if (!searchQuery.trim()) return locationItems.length
		const q = searchQuery.toLowerCase()
		return locationItems.filter((item) => {
			const name = (item.recipe?.title || item.ingredient?.name || '').toLowerCase()
			return name.includes(q)
		}).length
	}

	if (loading) {
		return <div className='loading'>{t('loading')}</div>
	}

	return (
		<div className='home-container'>
			<div className='page-header'>
				<h1 className='page-title'>{t('homePage.title')}</h1>
			</div>

			<div className='home-search'>
				<input
					type='text'
					className='form-input'
					placeholder={t('homePage.searchPlaceholder')}
					value={searchQuery}
					onChange={(e) => {
						setSearchQuery(e.target.value)
						setSearchParams(
							(prev) => {
								const p = new URLSearchParams(prev)
								p.set('page', '1')
								return p
							},
							{ replace: true }
						)
					}}
				/>
			</div>

			{searchQuery.trim() && crossSectionResults.length > 0 && (
				<div className='home-search-results'>
					<p className='search-results-title'>
						{t('homePage.searchResults')} ({crossSectionResults.length})
					</p>
					<div className='home-items-grid'>
						{crossSectionResults.slice(0, 3).map((item) => (
							<HomeItemCard
								key={`search-${item.id}`}
								item={item}
								onUpdate={handleUpdate}
								onDelete={handleDelete}
								onCook={handleCook}
								onAddToWeekPlan={handleOpenWeekPlan}
								showLocation
							/>
						))}
					</div>
					{crossSectionResults.length > 3 && (
						<p className='search-results-more'>
							y {crossSectionResults.length - 3} {t('homePage.moreResults')}
						</p>
					)}
				</div>
			)}

			<div className='home-tabs'>
				{LOCATIONS.map((loc) => (
					<button
						key={loc.id}
						className={`home-tab ${activeTab === loc.id ? 'active' : ''}`}
						onClick={() => {
							setSearchParams({ tab: loc.id, page: '1' }, { replace: true })
							setShowAddForm(false)
						}}>
						<span className='home-tab-icon'>{loc.icon}</span>
						<span className='home-tab-label'>{loc.label}</span>
						{getLocationCount(loc.id) > 0 && (
							<span className='home-tab-count'>{getLocationCount(loc.id)}</span>
						)}
					</button>
				))}
			</div>

			<div className='home-content'>
				{showAddForm ? (
					<AddHomeItemForm
						location={activeTab}
						onSubmit={handleAdd}
						onCancel={() => setShowAddForm(false)}
					/>
				) : (
					<button className='btn btn-primary add-item-btn' onClick={() => setShowAddForm(true)}>
						+ {t('homePage.addTo', { location: LOCATIONS.find((l) => l.id === activeTab)?.label })}
					</button>
				)}

				{filteredItems.length === 0 ? (
					<div className='home-empty'>
						<p>
							{t('homePage.emptyLocation', {
								location: LOCATIONS.find((l) => l.id === activeTab)?.label?.toLowerCase(),
							})}
						</p>
					</div>
				) : (
					<>
						<div className='home-items-grid'>
							{visibleItems.map((item) => (
								<HomeItemCard
									key={item.id}
									item={item}
									onUpdate={handleUpdate}
									onDelete={handleDelete}
									onCook={handleCook}
									onAddToWeekPlan={handleOpenWeekPlan}
								/>
							))}
						</div>
						<Pagination
							currentPage={currentPage}
							total={filteredItems.length}
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
			</div>

			{weekPlanItem && (
				<div className='modal-overlay' onClick={() => setWeekPlanItem(null)}>
					<div className='modal-content' onClick={(e) => e.stopPropagation()}>
						<h3>
							{t('homePage.addToWeekPlan')}:{' '}
							{weekPlanItem.recipe?.title || weekPlanItem.ingredient?.name}
						</h3>
						<div className='form-row'>
							<label className='form-label'>{t('homePage.date')}</label>
							<input
								type='date'
								className='form-input'
								value={wpDate}
								onChange={(e) => setWpDate(e.target.value)}
							/>
						</div>
						{weekPlanItem.ingredient ? (
							<div className='form-row'>
								<label className='form-label'>{t('homePage.quantity')}</label>
								<div className='form-row-inline'>
									<input
										type='number'
										className='form-input'
										value={wpQty}
										onChange={(e) => setWpQty(Number(e.target.value))}
										min={1}
									/>
									<span className='form-unit'>{wpUnit}</span>
								</div>
							</div>
						) : (
							<div className='form-row'>
								<label className='form-label'>{t('homePage.servings')}</label>
								<input
									type='number'
									className='form-input'
									value={wpServings}
									onChange={(e) => setWpServings(Number(e.target.value))}
									min={1}
								/>
							</div>
						)}
						<div className='modal-actions'>
							<button className='btn btn-outline' onClick={() => setWeekPlanItem(null)}>
								{t('cancel')}
							</button>
							<button className='btn btn-primary' onClick={handleAddToWeekPlan} disabled={wpAdding}>
								{wpAdding ? t('loading') : t('add')}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
