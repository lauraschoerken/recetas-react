import './HomeContainer.scss'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CreateHomeItemData, HomeItem, HomeLocation, homeService } from '@/services/home'
import { useDialog } from '@/utils/dialog/DialogContext'

import { AddHomeItemForm } from '../components/AddHomeItemForm'
import { HomeItemCard } from '../components/HomeItemCard'

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
	const [activeTab, setActiveTab] = useState<HomeLocation>('nevera')
	const [showAddForm, setShowAddForm] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')

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

	const filteredItems = items
		.filter((item) => item.location === activeTab)
		.filter((item) => {
			if (!searchQuery.trim()) return true
			const q = searchQuery.toLowerCase()
			const name = (item.recipe?.title || item.ingredient?.name || '').toLowerCase()
			return name.includes(q)
		})

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
					onChange={(e) => setSearchQuery(e.target.value)}
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
							setActiveTab(loc.id)
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
					<div className='home-items-grid'>
						{filteredItems.map((item) => (
							<HomeItemCard
								key={item.id}
								item={item}
								onUpdate={handleUpdate}
								onDelete={handleDelete}
								onCook={handleCook}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
