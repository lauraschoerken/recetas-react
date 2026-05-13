import './ProductListContainer.scss'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Product, ProductOverride, productService } from '@/services/product'
import { authService } from '@/services/auth'
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

	const isAdmin = authService.isAdmin()

	// Productos ocultos
	const [hiddenProducts, setHiddenProducts] = useState<Product[]>([])
	const [showHidden, setShowHidden] = useState(false)

	// Modal crear/editar (productos privados)
	const [showForm, setShowForm] = useState(false)
	const [editProduct, setEditProduct] = useState<Product | null>(null)
	const [formName, setFormName] = useState('')
	const [formImageUrl, setFormImageUrl] = useState('')
	const [formError, setFormError] = useState<string | null>(null)
	const [saving, setSaving] = useState(false)

	// Modal override/personalizaciÃ³n (productos globales)
	const [overrideProduct, setOverrideProduct] = useState<Product | null>(null)
	const [overrideName, setOverrideName] = useState('')
	const [overrideImageUrl, setOverrideImageUrl] = useState('')
	const [overrideLoading, setOverrideLoading] = useState(false)
	const [overrideSaving, setOverrideSaving] = useState(false)
	const [existingOverride, setExistingOverride] = useState<ProductOverride | null>(null)
	// Vista: 'edit' (admin edita global) | 'override' (usuario personaliza)
	const [overrideMode, setOverrideMode] = useState<'edit' | 'override'>('override')
	// Estado para ⋯ proponer campo al admin (no-admin)
	const [productFieldMenuOpen, setProductFieldMenuOpen] = useState<'name' | 'imageUrl' | null>(null)
	const [productInlinePropose, setProductInlinePropose] = useState<{ field: 'name' | 'imageUrl'; value: string } | null>(null)

	// Modal aÃ±adir a compra
	const [shoppingProduct, setShoppingProduct] = useState<Product | null>(null)
	const [shoppingQty, setShoppingQty] = useState(1)
	const [shoppingUnit, setShoppingUnit] = useState('unidad')
	const [shoppingAdding, setShoppingAdding] = useState(false)

	// Modal aÃ±adir a casa
	const [homeProduct, setHomeProduct] = useState<Product | null>(null)
	const [homeLocation, setHomeLocation] = useState<(typeof LOCATIONS)[number]>('nevera')
	const [homeQty, setHomeQty] = useState(1)
	const [homeUnit, setHomeUnit] = useState('unidad')
	const [homeExpires, setHomeExpires] = useState('')
	const [homeAdding, setHomeAdding] = useState(false)

	useEffect(() => {
		loadProducts()
		if (!isAdmin) loadHiddenProducts()
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

	const loadHiddenProducts = async () => {
		try {
			const data = await productService.getHidden()
			setHiddenProducts(data)
		} catch {
			console.error('Error loading hidden products')
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

	const handleHide = async (p: Product) => {
		try {
			await productService.hide(p.id)
			toast.success(t('products.hidden'))
			loadProducts()
			loadHiddenProducts()
		} catch {
			toast.error(t('error'))
		}
	}

	const handleUnhide = async (p: Product) => {
		try {
			await productService.unhide(p.id)
			toast.success(t('products.unhidden'))
			loadProducts()
			loadHiddenProducts()
		} catch {
			toast.error(t('error'))
		}
	}

	// Abrir modal para producto global (admin edita / user personaliza o propone)
	const openOverride = async (p: Product) => {
		setOverrideProduct(p)
		setOverrideMode(isAdmin ? 'edit' : 'override')
		setOverrideName(p.name)
		setOverrideImageUrl(p.imageUrl ?? '')
		setExistingOverride(null)
		setOverrideLoading(true)
		try {
			if (!isAdmin) {
				const ov = await productService.getOverride(p.id)
				if (ov) {
					setExistingOverride(ov)
					setOverrideName(ov.name ?? p.name)
					setOverrideImageUrl(ov.imageUrl ?? p.imageUrl ?? '')
				}
			}
		} catch {
			// sin override previo
		} finally {
			setOverrideLoading(false)
		}
	}

	const closeOverrideModal = () => {
		setOverrideProduct(null)
		setExistingOverride(null)
		setOverrideMode('override')
	}

	const handleSaveOverride = async () => {
		if (!overrideProduct) return
		setOverrideSaving(true)
		try {
			if (isAdmin) {
				// Admin edita el producto global directamente
				await productService.update(overrideProduct.id, {
					name: overrideName.trim() || undefined,
					imageUrl: overrideImageUrl || undefined,
				})
				toast.success(t('products.updated'))
				loadProducts()
			} else {
				// Usuario guarda override personal
				await productService.upsertOverride(overrideProduct.id, {
					name: overrideName.trim() !== overrideProduct.name ? overrideName.trim() : undefined,
					imageUrl:
						overrideImageUrl !== (overrideProduct.imageUrl ?? '')
							? overrideImageUrl || null
							: undefined,
				})
				toast.success(t('products.overrideSaved'))
			}
			closeOverrideModal()
		} catch {
			toast.error(t('products.saveError'))
		} finally {
			setOverrideSaving(false)
		}
	}

	const handleDeleteOverride = async () => {
		if (!overrideProduct) return
		const confirmed = await confirm({
			title: t('products.deleteOverrideTitle'),
			message: t('products.deleteOverrideConfirm'),
			confirmText: t('delete'),
			type: 'danger',
		})
		if (!confirmed) return
		try {
			await productService.deleteOverride(overrideProduct.id)
			toast.success(t('products.overrideDeleted'))
			closeOverrideModal()
		} catch {
			toast.error(t('error'))
		}
	}

	const handleProductProposeField = async () => {
		if (!overrideProduct || !productInlinePropose) return
		const { field, value } = productInlinePropose
		if (!value.trim()) return
		setOverrideSaving(true)
		try {
			await productService.propose(overrideProduct.id, {
				fieldName: field,
				currentValue: field === 'name' ? overrideProduct.name : (overrideProduct.imageUrl ?? ''),
				proposedValue: value.trim(),
			})
			toast.success(t('products.proposeSent'))
			setProductInlinePropose(null)
			setProductFieldMenuOpen(null)
		} catch (e: any) {
			if (e.message?.includes('duplicate') || e.message?.includes('ya tienes')) {
				toast.error(t('products.proposeDuplicate'))
			} else {
				toast.error(e.message || t('products.saveError'))
			}
		} finally {
			setOverrideSaving(false)
		}
	}

	// handlePropose removed — now using handleProductProposeField with inline proposal UI

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
							isAdmin={isAdmin}
							onEdit={openEdit}
							onDelete={handleDelete}
							onOverride={openOverride}
							onHide={handleHide}
							onAddToShopping={openAddToShopping}
							onAddToHome={openAddToHome}
						/>
					))}
				</div>
			)}

			{/* Sección de productos ocultos (solo usuarios no-admin) */}
			{!isAdmin && hiddenProducts.length > 0 && (
				<div className='hidden-products-section'>
					<button
						className='btn btn-outline hidden-products-toggle'
						onClick={() => setShowHidden((v) => !v)}>
						{showHidden
							? t('products.hideHiddenList')
							: t('products.showHiddenList', { count: hiddenProducts.length })}
					</button>
					{showHidden && (
						<div className='products-grid products-grid--hidden'>
							{hiddenProducts.map((p) => (
								<div key={p.id} className='hidden-product-row'>
									<span className='hidden-product-name'>{p.name}</span>
									<button className='btn btn-outline btn-sm' onClick={() => handleUnhide(p)}>
										{t('products.unhide')}
									</button>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{/* Modal crear/editar productos privados */}
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

			{/* Modal override/propuesta para productos globales */}
			{overrideProduct && (
				<div className='modal-overlay' onClick={closeOverrideModal}>
					<div className='modal-card' onClick={(e) => e.stopPropagation()}>
						{overrideLoading ? (
							<p className='text-muted'>{t('loading')}</p>
						) : (
							<>
								<h3>
									{isAdmin ? t('products.editTitle') : t('products.customizeTitle')}
								</h3>
								<p className='text-muted' style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
									{overrideProduct.name}
								</p>

								{/* Admin: editar producto global */}
								{overrideMode === 'edit' && (
									<>
										<div className='form-group'>
											<label>{t('products.name')}</label>
											<input
												type='text'
												className='form-input'
												value={overrideName}
												onChange={(e) => setOverrideName(e.target.value)}
												autoFocus
											/>
										</div>
										<div className='form-group'>
											<label>{t('products.imageUrl')}</label>
											<input
												type='text'
												className='form-input'
												value={overrideImageUrl}
												onChange={(e) => setOverrideImageUrl(e.target.value)}
												placeholder='https://...'
											/>
										</div>
										<div className='modal-actions'>
											<button className='btn btn-outline' onClick={closeOverrideModal}>
												{t('cancel')}
											</button>
											<button
												className='btn btn-primary'
												onClick={handleSaveOverride}
												disabled={overrideSaving}>
												{overrideSaving ? t('saving') : t('save')}
											</button>
										</div>
									</>
								)}

								{overrideMode !== 'edit' && !isAdmin && (
									<>
										<p className='text-muted' style={{ fontSize: '0.8rem' }}>
											{t('products.overrideDesc')}
										</p>

										{/* Nombre */}
										<div className='form-group'>
											<div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
												<label style={{ margin: 0 }}>{t('products.name')}</label>
												<div className='ifm-conv-menu'>
													<button
														className='btn-icon-small ifm-conv-menu-btn'
														type='button'
														onClick={() => setProductFieldMenuOpen(productFieldMenuOpen === 'name' ? null : 'name')}>
														⋯
													</button>
													{productFieldMenuOpen === 'name' && (
														<div className='ifm-conv-menu-dropdown'>
															<button
																type='button'
																className='ifm-conv-menu-item'
																onClick={() => {
																	setProductInlinePropose({ field: 'name', value: overrideProduct.name })
																	setProductFieldMenuOpen(null)
																}}>
																{t('products.tabPropose')}
															</button>
														</div>
													)}
												</div>
											</div>
											<input
												type='text'
												className='form-input'
												value={overrideName}
												onChange={(e) => setOverrideName(e.target.value)}
												autoFocus
											/>
											{productInlinePropose?.field === 'name' && (
												<div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'var(--surface-2)', borderRadius: '0.4rem' }}>
													<p className='text-muted' style={{ fontSize: '0.8rem', marginBottom: '0.4rem' }}>{t('products.proposeDesc')}</p>
													<input
														type='text'
														className='form-input'
														value={productInlinePropose.value}
														onChange={(e) => setProductInlinePropose({ field: 'name', value: e.target.value })}
													/>
													<div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
														<button
															className='btn btn-sm btn-secondary'
															disabled={overrideSaving || !productInlinePropose.value.trim()}
															onClick={handleProductProposeField}>
															{overrideSaving ? t('saving') : t('products.sendProposal')}
														</button>
														<button
															className='btn btn-sm btn-outline'
															onClick={() => setProductInlinePropose(null)}>
															{t('cancel')}
														</button>
													</div>
												</div>
											)}
										</div>

										{/* Imagen */}
										<div className='form-group'>
											<div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
												<label style={{ margin: 0 }}>{t('products.imageUrl')}</label>
												<div className='ifm-conv-menu'>
													<button
														className='btn-icon-small ifm-conv-menu-btn'
														type='button'
														onClick={() => setProductFieldMenuOpen(productFieldMenuOpen === 'imageUrl' ? null : 'imageUrl')}>
														⋯
													</button>
													{productFieldMenuOpen === 'imageUrl' && (
														<div className='ifm-conv-menu-dropdown'>
															<button
																type='button'
																className='ifm-conv-menu-item'
																onClick={() => {
																	setProductInlinePropose({ field: 'imageUrl', value: overrideProduct.imageUrl ?? '' })
																	setProductFieldMenuOpen(null)
																}}>
																{t('products.tabPropose')}
															</button>
														</div>
													)}
												</div>
											</div>
											<input
												type='text'
												className='form-input'
												value={overrideImageUrl}
												onChange={(e) => setOverrideImageUrl(e.target.value)}
												placeholder='https://...'
											/>
											{productInlinePropose?.field === 'imageUrl' && (
												<div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'var(--surface-2)', borderRadius: '0.4rem' }}>
													<p className='text-muted' style={{ fontSize: '0.8rem', marginBottom: '0.4rem' }}>{t('products.proposeDesc')}</p>
													<input
														type='text'
														className='form-input'
														value={productInlinePropose.value}
														onChange={(e) => setProductInlinePropose({ field: 'imageUrl', value: e.target.value })}
													/>
													<div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
														<button
															className='btn btn-sm btn-secondary'
															disabled={overrideSaving || !productInlinePropose.value.trim()}
															onClick={handleProductProposeField}>
															{overrideSaving ? t('saving') : t('products.sendProposal')}
														</button>
														<button
															className='btn btn-sm btn-outline'
															onClick={() => setProductInlinePropose(null)}>
															{t('cancel')}
														</button>
													</div>
												</div>
											)}
										</div>

										<div className='modal-actions'>
											{existingOverride && (
												<button
													className='btn btn-outline btn-outline--danger'
													onClick={handleDeleteOverride}>
													{t('products.deleteOverride')}
												</button>
											)}
											<button className='btn btn-outline' onClick={closeOverrideModal}>
												{t('cancel')}
											</button>
											<button
												className='btn btn-primary'
												onClick={handleSaveOverride}
												disabled={overrideSaving}>
												{overrideSaving ? t('saving') : t('products.savePersonal')}
											</button>
										</div>
									</>
								)}
							</>
						)}
					</div>
				</div>
			)}

			{/* Modal aÃ±adir a lista de la compra */}
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

			{/* Modal aÃ±adir a casa */}
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
