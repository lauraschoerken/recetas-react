import './ProductListContainer.scss'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Product, productService } from '@/services/product'
import { useDialog } from '@/utils/dialog/DialogContext'
import { normalizeText } from '@/utils/normalize'

export function ProductListContainer() {
	const { t } = useTranslation()
	const { toast, confirm } = useDialog()
	const [products, setProducts] = useState<Product[]>([])
	const [loading, setLoading] = useState(true)
	const [search, setSearch] = useState('')
	const [showForm, setShowForm] = useState(false)
	const [editProduct, setEditProduct] = useState<Product | null>(null)
	const [formName, setFormName] = useState('')
	const [formImageUrl, setFormImageUrl] = useState('')
	const [formError, setFormError] = useState<string | null>(null)
	const [saving, setSaving] = useState(false)

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
				await productService.update(editProduct.id, {
					name,
					imageUrl: formImageUrl || undefined,
				})
				toast.success(t('products.updated'))
			} else {
				await productService.create({ name, imageUrl: formImageUrl || undefined })
				toast.success(t('products.created'))
			}
			setShowForm(false)
			loadProducts()
		} catch (err: any) {
			if (err?.status === 409 || err?.httpCode === 409) {
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
				className='form-input'
				placeholder={t('products.searchPlaceholder')}
				value={search}
				onChange={(e) => setSearch(e.target.value)}
				style={{ marginBottom: '1rem' }}
			/>

			{filtered.length === 0 ? (
				<p className='text-muted'>{t('products.noProducts')}</p>
			) : (
				<div className='product-grid'>
					{filtered.map((p) => (
						<div key={p.id} className='product-card'>
							{p.imageUrl && <img src={p.imageUrl} alt={p.name} className='product-card__img' />}
							<div className='product-card__body'>
								<span className='product-card__name'>{p.name}</span>
								{p.status === 'GLOBAL' && <span className='product-card__badge'>G</span>}
							</div>
							<div className='product-card__actions'>
								<button
									className='btn btn-sm btn-outline'
									onClick={() => openEdit(p)}
									disabled={p.status === 'GLOBAL'}>
									{t('edit')}
								</button>
								<button
									className='btn btn-sm btn-danger'
									onClick={() => handleDelete(p)}
									disabled={p.status === 'GLOBAL'}>
									{t('delete')}
								</button>
							</div>
						</div>
					))}
				</div>
			)}

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
		</div>
	)
}
