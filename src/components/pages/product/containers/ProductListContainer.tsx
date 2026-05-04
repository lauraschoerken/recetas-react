import './ProductListContainer.scss'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Product, productService } from '@/services/product'
import { useDialog } from '@/utils/dialog/DialogContext'
import { normalizeText } from '@/utils/normalize'
import { ProductCard } from '../components/ProductCard'

const DEFAULT_UNITS = ['unidad', 'g', 'kg', 'ml', 'l', 'porciones']
const LOCATIONS = ['nevera', 'congelador', 'despensa'] as const

export function ProductListContainer() {
	const { t } = useTranslation()
	const { toast, confirm } = useDialog()
	const [products, setProducts] = useState<Product[]>([])
	const [loading, setLoading] = useState(true)
	const [search, setSearch] = useState('')

	// Modal crear/editar
	const [showForm, setShowForm] = useState(false)
	const [editProduct, setEditProduct] = useState<Product | null>(null)
	const [formName, setFormName] = useState('')
	const [formImageUrl, setFormImageUrl] = useState('')
	const [formError, setFormError] = useState<string | null>(null)
	const [saving, setSaving] = useState(false)

	// Modal añadir a compra
	const [shoppingProduct, setShoppingProduct] = useState<Product | null>(null)
	const [shoppingQty, setShoppingQty] = useState(1)
	const [shoppingUnit, setShoppingUnit] = useState('unidad')
	const [shoppingAdding, setShoppingAdding] = useState(false)

	// Modal añadir a casa
	const [homeProduct, setHomeProduct] = useState<Product | null>(null)
	const [homeLocation, setHomeLocation] = useState<(typeof LOCATIONS)[number]>('nevera')
	const [homeQty, setHomeQty] = useState(1)
	const [homeUnit, setHomeUnit] = useState('unidad')
	const [homeExpires, setHomeExpires] = useState('')
	const [homeAdding, setHomeAdding] = useState(false)

	useEffect(() => {
		loadProducts()
	}, [])

	const loadProducts = async () => {
		try {
			const data = await productService.getAll()
			setProducts(data)
		} catch {
			console.error('Error loading products')
		} finally {
			setLoading(false)
		}
	}

	const openCreate = () => {
		setEditProduct(null)
		setFormName('')
		setFormImageUrl('')
		setFormError(null)
		setShowForm(true)
	}

	const openEdit = (p: Product) => {
		setEditProduct(p)
		setFormName(p.name)
		setFormImageUrl(p.imageUrl ?? '')
		setFormError(null)
		setShowForm(true)
	}

	const handleSave = async () => {
		const name = formName.trim()
		if (!name) return
		setSaving(true)
		setFormError(null)
		try {
			if (editProduct) {
				await productService.update(editProduct.id, { name, imageUrl: formImageUrl || undefined })
				toast.success(t('products.updated'))
			} else {
				await productService.create({ name, imageUrl: formImageUrl || undefined })
				toast.success(t('products.created'))
			}
			setShowForm(false)
			loadProducts()
		} catch (err: unknown) {
			const e = err as { status?: number; httpCode?: number }
			if (e?.status === 409 || e?.httpCode === 409) {
				setFormError(t('products.duplicateName'))
			} else {
				toast.error(t('products.saveError'))
			}
		} finally {
			setSaving(false)
		}
	}

	const handleDelete = async (p: Product) => {
		const confirmed = await confirm({
			title: t('products.deleteTitle'),
			message: t('products.deleteConfirm', { name: p.name }),
			confirmText: t('delete'),
			type: 'danger',
		})
		if (!confirmed) return
		try {
			await productService.delete(p.id)
			toast.success(t('products.deleted'))
			loadProducts()
		} catch {
			toast.error(t('products.deleteError'))
		}
	}

	const openAddToShopping = (p: Product) => {
		setShoppingProduct(p)
		setShoppingQty(1)
		setShoppingUnit('unidad')
	}

	const handleAddToShopping = async () => {
		if (!shoppingProduct) return
		setShoppingAdding(true)
		try {
			await productService.addToShoppingList(shoppingProduct.id, shoppingQty, shoppingUnit)
			toast.success(t('products.addedToShopping'))
			setShoppingProduct(null)
		} catch {
			toast.error(t('error'))
		} finally {
			setShoppingAdding(false)
		}
	}

	const openAddToHome = (p: Product) => {
		setHomeProduct(p)
		setHomeLocation('nevera')
		setHomeQty(1)
		setHomeUnit('unidad')
		setHomeExpires('')
	}

	const handleAddToHome = async () => {
		if (!homeProduct) return
		setHomeAdding(true)
		try {
			await productService.addToHome(homeProduct.id, {
				location: homeLocation,
				quantity: homeQty,
				unit: homeUnit,
				expiresAt: homeExpires || undefined,
			})
			toast.success(t('products.addedToHome'))
			setHomeProduct(null)
		} catch {
			toast.error(t('error'))
		} finally {
			setHomeAdding(false)
		}
	}

	const filtered = products.filter((p) => normalizeText(p.name).includes(normalizeText(search)))

	if (loading) return <div className='loading'>{t('loading')}</div>

	return (
		<div className='product-list-container'>
			<div className='page-header'>
				<h1 className='page-title'>{t('products.title')}</h1>
				<button className='btn btn-primary' onClick={openCreate}>
					{t('products.add')}
				</button>
			</div>

			<input
				type='text'
				className='form-input product-search-input'
				placeholder={t('products.searchPlaceholder')}
				value={search}
				onChange={(e) => setSearch(e.target.value)}
			/>

			{filtered.length === 0 ? (
				<p className='text-muted'>{t('products.noProducts')}</p>
			) : (
				<div className='products-grid'>
					{filtered.map((p) => (
						<ProductCard
							key={p.id}
							product={p}
							onEdit={openEdit}
							onDelete={handleDelete}
							onAddToShopping={openAddToShopping}
							onAddToHome={openAddToHome}
						/>
					))}
				</div>
			)}

			{/* Modal crear/editar */}
			{showForm && (
				<div className='modal-overlay' onClick={() => setShowForm(false)}>
					<div className='modal-card' onClick={(e) => e.stopPropagation()}>
						<h3>{editProduct ? t('products.editTitle') : t('products.createTitle')}</h3>
						<div className='form-group'>
							<label>{t('products.name')}</label>
							<input
								type='text'
								className='form-input'
								value={formName}
								onChange={(e) => {
									setFormName(e.target.value)
									setFormError(null)
								}}
								autoFocus
								onKeyDown={(e) => e.key === 'Enter' && handleSave()}
							/>
						</div>
						<div className='form-group'>
							<label>{t('products.imageUrl')}</label>
							<input
								type='text'
								className='form-input'
								value={formImageUrl}
								onChange={(e) => setFormImageUrl(e.target.value)}
								placeholder='https://...'
							/>
						</div>
						{formError && <p className='text-danger'>{formError}</p>}
						<div className='modal-actions'>
							<button className='btn btn-outline' onClick={() => setShowForm(false)}>
								{t('cancel')}
							</button>
							<button className='btn btn-primary' onClick={handleSave} disabled={saving}>
								{saving ? t('saving') : t('save')}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Modal añadir a lista de la compra */}
			{shoppingProduct && (
				<div className='modal-overlay' onClick={() => setShoppingProduct(null)}>
					<div className='modal-card' onClick={(e) => e.stopPropagation()}>
						<h3>{t('products.addToShoppingTitle', { name: shoppingProduct.name })}</h3>
						<div className='form-row'>
							<input
								type='number'
								className='form-input'
								value={shoppingQty}
								onChange={(e) => setShoppingQty(parseFloat(e.target.value) || 1)}
								min={0.1}
								step={0.1}
							/>
							<select
								className='form-input'
								value={shoppingUnit}
								onChange={(e) => setShoppingUnit(e.target.value)}>
								{DEFAULT_UNITS.map((u) => (
									<option key={u} value={u}>
										{u}
									</option>
								))}
							</select>
						</div>
						<div className='modal-actions'>
							<button className='btn btn-outline' onClick={() => setShoppingProduct(null)}>
								{t('cancel')}
							</button>
							<button
								className='btn btn-primary'
								onClick={handleAddToShopping}
								disabled={shoppingAdding}>
								{t('add')}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Modal añadir a casa */}
			{homeProduct && (
				<div className='modal-overlay' onClick={() => setHomeProduct(null)}>
					<div className='modal-card' onClick={(e) => e.stopPropagation()}>
						<h3>{t('products.addToHomeTitle', { name: homeProduct.name })}</h3>
						<div className='form-group'>
							<select
								className='form-input'
								value={homeLocation}
								onChange={(e) => setHomeLocation(e.target.value as (typeof LOCATIONS)[number])}>
								<option value='nevera'>{t('homePage.fridge')}</option>
								<option value='congelador'>{t('homePage.freezer')}</option>
								<option value='despensa'>{t('homePage.pantry')}</option>
							</select>
						</div>
						<div className='form-row'>
							<input
								type='number'
								className='form-input'
								value={homeQty}
								onChange={(e) => setHomeQty(parseFloat(e.target.value) || 1)}
								min={0.1}
								step={0.1}
							/>
							<select
								className='form-input'
								value={homeUnit}
								onChange={(e) => setHomeUnit(e.target.value)}>
								{DEFAULT_UNITS.map((u) => (
									<option key={u} value={u}>
										{u}
									</option>
								))}
							</select>
						</div>
						<div className='form-group'>
							<label className='form-label'>{t('homePage.expiresLabel')}</label>
							<input
								type='date'
								className='form-input'
								value={homeExpires}
								onChange={(e) => setHomeExpires(e.target.value)}
							/>
						</div>
						<div className='modal-actions'>
							<button className='btn btn-outline' onClick={() => setHomeProduct(null)}>
								{t('cancel')}
							</button>
							<button className='btn btn-primary' onClick={handleAddToHome} disabled={homeAdding}>
								{t('add')}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
