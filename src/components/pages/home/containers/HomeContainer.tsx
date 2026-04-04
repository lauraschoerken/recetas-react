import './HomeContainer.css'

import { useEffect,useState } from 'react'

import { CreateHomeItemData,HomeItem, HomeLocation, homeService } from '@/services/home'
import { useDialog } from '@/utils/dialog/DialogContext'

import { AddHomeItemForm } from '../components/AddHomeItemForm'
import { HomeItemCard } from '../components/HomeItemCard'

const LOCATIONS: { id: HomeLocation; label: string; icon: string }[] = [
	{ id: 'nevera', label: 'Nevera', icon: '❄️' },
	{ id: 'congelador', label: 'Congelador', icon: '🧊' },
	{ id: 'despensa', label: 'Despensa', icon: '🏠' },
]

export function HomeContainer() {
	const { confirm, toast } = useDialog()
	const [items, setItems] = useState<HomeItem[]>([])
	const [loading, setLoading] = useState(true)
	const [activeTab, setActiveTab] = useState<HomeLocation>('nevera')
	const [showAddForm, setShowAddForm] = useState(false)

	useEffect(() => {
		initializeHome()
	}, [])

	const initializeHome = async () => {
		try {
			await homeService.processConsumed()
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
			toast.success('Item añadido')
		} catch (error) {
			toast.error('Error al añadir item')
		}
	}

	const handleUpdate = async (id: number, data: { quantity?: number; location?: HomeLocation }) => {
		try {
			await homeService.update(id, data)
			await loadItems()
		} catch (error) {
			toast.error('Error al actualizar item')
		}
	}

	const handleDelete = async (id: number) => {
		const confirmed = await confirm({
			title: 'Eliminar item',
			message: '¿Estás seguro de que quieres eliminar este item?',
			confirmText: 'Eliminar',
			type: 'danger',
		})
		if (!confirmed) return

		try {
			await homeService.delete(id)
			setItems(items.filter((item) => item.id !== id))
			toast.success('Item eliminado')
		} catch (error) {
			toast.error('Error al eliminar item')
		}
	}

	const handleCook = async (_id: number, result: { success: boolean; message: string }) => {
		if (result.success) {
			toast.success(result.message)
			await loadItems()
		} else {
			toast.error('Error al cocinar ingrediente')
		}
	}

	const filteredItems = items.filter((item) => item.location === activeTab)

	const getLocationCount = (location: HomeLocation) =>
		items.filter((item) => item.location === location).length

	if (loading) {
		return <div className='loading'>Cargando...</div>
	}

	return (
		<div className='home-container'>
			<div className='page-header'>
				<h1 className='page-title'>Mi Casa</h1>
			</div>

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
						+ Añadir a {LOCATIONS.find((l) => l.id === activeTab)?.label}
					</button>
				)}

				{filteredItems.length === 0 ? (
					<div className='home-empty'>
						<p>No hay nada en {LOCATIONS.find((l) => l.id === activeTab)?.label.toLowerCase()}</p>
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
