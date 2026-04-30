import './IngredientFormModal.scss'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CloseIcon, DeleteIcon, EditIcon, StarIcon } from '@/components/shared/icons'
import { Modal } from '@/components/shared/modal'
import { alertService, IngredientThreshold } from '@/services/alert'
import { authService } from '@/services/auth'
import {
	Ingredient,
	ingredientService,
	IngredientVariant,
	UnitConversion,
} from '@/services/ingredient'
import { IngredientTag, ingredientTagService } from '@/services/ingredientExtras'
import { ingredientProposalService, ProposalType } from '@/services/ingredientProposal'
import { storeService, UserStore } from '@/services/store'
import { useDialog } from '@/utils/dialog/DialogContext'

import { IngredientTagsPanel } from '../components/IngredientTagsPanel'

const BASE_UNITS: ('g' | 'ml')[] = ['g', 'ml']

interface ConversionDraft {
	unitName: string
	gramsPerUnit: string
}

interface VariantDraft {
	id: string
	name: string
	isDefault: boolean
	calories: string
	protein: string
	carbs: string
	fat: string
	fiber: string
}

interface BulkRow {
	id: string
	name: string
	unit: 'g' | 'ml'
}

interface Props {
	isOpen: boolean
	onClose: () => void
	onSaved: () => void
	/** Pasado -> modo edicion; null/undefined -> modo creacion */
	ingredient?: Ingredient | null
	thresholdData?: IngredientThreshold | null
	/** Fuerza el campo nombre como readonly */
	readonlyName?: boolean
	/** Al cerrar el modal (X u overlay), guarda automáticamente en lugar de descartar */
	autoSaveOnClose?: boolean
}

// --- Sub-seccion: nombre, imagen, ubicacion ---------------------------------
interface BasicFieldsProps {
	name: string
	onNameChange: (v: string) => void
	imageUrl: string
	onImageUrlChange: (v: string) => void
	location: string
	onLocationChange: (v: string) => void
	unit?: string
	onUnitChange?: (v: 'g' | 'ml') => void
	onSave?: () => void
	saving?: boolean
	readonlyName?: boolean // true = usuario normal en ingrediente GLOBAL
}
function BasicFields({
	name,
	onNameChange,
	imageUrl,
	onImageUrlChange,
	location,
	onLocationChange,
	unit,
	onUnitChange,
	onSave,
	saving,
	readonlyName,
}: BasicFieldsProps) {
	const { t } = useTranslation()
	return (
		<>
			<div className='ifm-row'>
				<input
					type='text'
					className='form-input ifm-input-name'
					placeholder={t('ingredients.namePlaceholder')}
					value={name}
					onChange={(e) => onNameChange(e.target.value)}
					required={!onSave}
					readOnly={readonlyName}
					title={readonlyName ? t('ingredients.nameReadonlyHint') : undefined}
					style={readonlyName ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
				/>
				{onUnitChange ? (
					<select
						className='form-input ifm-unit-select'
						value={unit}
						onChange={(e) => onUnitChange(e.target.value as 'g' | 'ml')}>
						{BASE_UNITS.map((u) => (
							<option key={u} value={u}>
								{u}
							</option>
						))}
					</select>
				) : (
					<span className='ifm-unit-badge'>{unit}</span>
				)}
			</div>

			<div className='ifm-row ifm-image-row'>
				<input
					type='url'
					className='form-input'
					placeholder={t('ingredients.imageUrlPlaceholder')}
					value={imageUrl}
					onChange={(e) => onImageUrlChange(e.target.value)}
				/>
				{imageUrl && (
					<div className='ifm-img-preview'>
						<img
							src={imageUrl}
							alt='Preview'
							onError={(e) => (e.currentTarget.style.display = 'none')}
						/>
					</div>
				)}
			</div>

			<select
				className='form-input'
				value={location}
				onChange={(e) => onLocationChange(e.target.value)}>
				<option value=''>{t('ingredients.defaultLocationOption')}</option>
				<option value='nevera'>{t('homePage.fridge')}</option>
				<option value='congelador'>{t('homePage.freezer')}</option>
				<option value='despensa'>{t('homePage.pantry')}</option>
			</select>

			{onSave && (
				<div className='ifm-section-save'>
					<button
						type='button'
						className='btn btn-primary btn-sm'
						disabled={saving}
						onClick={onSave}>
						{saving ? t('loading') : t('save')}
					</button>
				</div>
			)}
		</>
	)
}

// --- Sub-seccion: tiendas ---------------------------------------------------
interface StoresSectionProps {
	allStores: UserStore[]
	activeStoreIds: number[]
	indifferent: boolean
	onToggleStore: (storeId: number) => void
	onReorder: (newIds: number[]) => void
	onIndifferentChange: (value: boolean) => void
}
function StoresSection({
	allStores,
	activeStoreIds,
	indifferent,
	onToggleStore,
	onReorder,
	onIndifferentChange,
}: StoresSectionProps) {
	const { t } = useTranslation()
	const [dragOverId, setDragOverId] = useState<number | null>(null)
	const dragId = useRef<number | null>(null)

	if (allStores.length === 0) return <p className='ifm-hint'>{t('ingredients.storesNone')}</p>

	const activeStores = activeStoreIds
		.map((id) => allStores.find((s) => s.id === id))
		.filter(Boolean) as UserStore[]
	const inactiveStores = allStores.filter((s) => !activeStoreIds.includes(s.id))

	const handleDragOver = (e: React.DragEvent, storeId: number) => {
		e.preventDefault()
		setDragOverId(storeId)
	}
	const handleDrop = (e: React.DragEvent, targetId: number) => {
		e.preventDefault()
		if (!dragId.current || dragId.current === targetId) {
			setDragOverId(null)
			return
		}
		const newIds = [...activeStoreIds]
		const fromIdx = newIds.indexOf(dragId.current)
		const toIdx = newIds.indexOf(targetId)
		newIds.splice(fromIdx, 1)
		newIds.splice(toIdx, 0, dragId.current)
		onReorder(newIds)
		dragId.current = null
		setDragOverId(null)
	}

	return (
		<div className='ifm-stores-section'>
			{/* Checkbox: me es indiferente */}
			<label
				className={`ifm-stores-indifferent${activeStoreIds.length === 0 ? ' is-disabled' : ''}`}>
				<input
					type='checkbox'
					checked={indifferent}
					disabled={activeStoreIds.length === 0}
					onChange={(e) => onIndifferentChange(e.target.checked)}
				/>
				<span>{t('stores.indifferentOrder')}</span>
			</label>

			{/* Tiendas activas — arrastrables si no es indiferente */}
			{activeStores.length > 0 && (
				<div className='ifm-stores-active'>
					{activeStores.map((store, index) => (
						<div
							key={store.id}
							className={`ifm-store-drag-row${indifferent ? ' is-indifferent' : ''}${dragOverId === store.id ? ' is-drag-over' : ''}`}
							draggable={!indifferent}
							onDragStart={() => {
								dragId.current = store.id
							}}
							onDragOver={(e) => !indifferent && handleDragOver(e, store.id)}
							onDrop={(e) => !indifferent && handleDrop(e, store.id)}
							onDragEnd={() => {
								dragId.current = null
								setDragOverId(null)
							}}>
							{!indifferent && (
								<span className='ifm-store-drag-handle' aria-hidden='true'>
									⠿
								</span>
							)}
							{!indifferent && <span className='ifm-store-drag-order'>{index + 1}</span>}
							<span className='ifm-store-drag-name'>
								{store.name}
								{store.isShared && <span className='ifm-store-badge'>{t('stores.shared')}</span>}
							</span>
							<button
								type='button'
								className='ifm-store-remove'
								title={t('stores.notHere')}
								onClick={() => onToggleStore(store.id)}>
								×
							</button>
						</div>
					))}
				</div>
			)}

			{/* Tiendas no seleccionadas */}
			{inactiveStores.length > 0 && (
				<div className='ifm-stores-inactive'>
					{inactiveStores.map((store) => (
						<button
							key={store.id}
							type='button'
							className='ifm-store-add-btn'
							onClick={() => onToggleStore(store.id)}>
							+ {store.name}
							{store.isShared && <span className='ifm-store-badge'>{t('stores.shared')}</span>}
						</button>
					))}
				</div>
			)}
		</div>
	)
}

// --- Componente principal ---------------------------------------------------
export function IngredientFormModal({
	isOpen,
	onClose,
	onSaved,
	ingredient,
	thresholdData,
	readonlyName: forceReadonlyName,
	autoSaveOnClose,
}: Props) {
	const { t } = useTranslation()
	const { toast } = useDialog()
	const isEdit = !!ingredient

	// Estado compartido
	const [name, setName] = useState('')
	const [imageUrl, setImageUrl] = useState('')
	const [location, setLocation] = useState('')

	// Estado creacion
	const [addMode, setAddMode] = useState<'single' | 'multiple'>('single')
	const [newUnit, setNewUnit] = useState<'g' | 'ml'>('g')
	const [newMinQuantity, setNewMinQuantity] = useState('')
	const [newVariants, setNewVariants] = useState<VariantDraft[]>([
		{
			id: 'v0',
			name: 'Crudo',
			isDefault: true,
			calories: '',
			protein: '',
			carbs: '',
			fat: '',
			fiber: '',
		},
	])
	const [showConversions, setShowConversions] = useState(false)
	const [newConversions, setNewConversions] = useState<ConversionDraft[]>([])
	const [newPreferredUnit, setNewPreferredUnit] = useState('')
	const [proposeOnCreate, setProposeOnCreate] = useState(false)
	const [activeStoreIds, setActiveStoreIds] = useState<number[]>([])
	const [storeOrderIndifferent, setStoreOrderIndifferent] = useState(false)
	const [bulkRows, setBulkRows] = useState<BulkRow[]>([{ id: 'b0', name: '', unit: 'g' }])
	const [bulkCreating, setBulkCreating] = useState(false)

	// Estado edicion
	const [savingBasic, setSavingBasic] = useState(false)
	const [localVariants, setLocalVariants] = useState<IngredientVariant[]>([])
	const [localConversions, setLocalConversions] = useState<UnitConversion[]>([])
	const [preferredUnit, setPreferredUnit] = useState('')
	const [minQuantity, setMinQuantity] = useState('')
	const [minUnit, setMinUnit] = useState('g')
	const [hasThreshold, setHasThreshold] = useState(false)
	const [editingVariantId, setEditingVariantId] = useState<number | null>(null)
	const [addingVariant, setAddingVariant] = useState(false)
	const [newConvUnit, setNewConvUnit] = useState('')
	const [newConvGrams, setNewConvGrams] = useState('')

	// Formulario macro inline
	const [vName, setVName] = useState('')
	const [vCalories, setVCalories] = useState('')
	const [vProtein, setVProtein] = useState('')
	const [vCarbs, setVCarbs] = useState('')
	const [vFat, setVFat] = useState('')
	const [vFiber, setVFiber] = useState('')

	// Tiendas (compartido)
	const [allStores, setAllStores] = useState<UserStore[]>([])

	// Tags
	const [allTags, setAllTags] = useState<IngredientTag[]>([])
	const [newTagIds, setNewTagIds] = useState<number[]>([])
	const [creatingNewTag, setCreatingNewTag] = useState(false)
	const [newTagInput, setNewTagInput] = useState('')

	// Propuesta al admin
	const [showProposalForm, setShowProposalForm] = useState(false)
	const [proposalType, setProposalType] = useState<ProposalType>('EDIT_FIELD')
	const [proposalField, setProposalField] = useState('name')
	const [proposalValue, setProposalValue] = useState('')
	const [proposalConvUnit, setProposalConvUnit] = useState('')
	const [proposalConvGrams, setProposalConvGrams] = useState('')
	const [sendingProposal, setSendingProposal] = useState(false)
	const [convMenuOpenId, setConvMenuOpenId] = useState<number | null>(null)

	// Detectar si el usuario es admin y si el ingrediente es GLOBAL
	const isUserAdmin = authService.isAdmin()
	const isGlobalIngredient = ingredient?.status === 'GLOBAL' || (!ingredient?.status && isEdit)

	// Inicializacion al abrir
	useEffect(() => {
		if (!isOpen) return
		storeService
			.getAll()
			.then(setAllStores)
			.catch(() => setAllStores([]))
		ingredientTagService
			.getAll()
			.then(setAllTags)
			.catch(() => setAllTags([]))

		if (ingredient) {
			setName(ingredient.name)
			setImageUrl(ingredient.imageUrl ?? '')
			setLocation(ingredient.defaultLocation ?? '')
			setLocalVariants(ingredient.variants ?? [])
			// Inicializar con datos del listado; luego cargar conversiones frescas (incluye personales)
			setLocalConversions(ingredient.conversions ?? [])
			ingredientService
				.getConversions(ingredient.id)
				.then(setLocalConversions)
				.catch(() => {
					/* mantener las del listado si falla */
				})
			setPreferredUnit(ingredient.preferredUnit ?? '')
			if (thresholdData) {
				setMinQuantity(thresholdData.minQuantity.toString())
				setMinUnit(thresholdData.unit)
				setHasThreshold(true)
			} else {
				setMinQuantity('')
				setMinUnit(ingredient.unit ?? 'g')
				setHasThreshold(false)
			}
			setEditingVariantId(null)
			setAddingVariant(false)
			setNewConvUnit('')
			setNewConvGrams('')
		} else {
			setName('')
			setImageUrl('')
			setLocation('')
			setAddMode('single')
			setNewUnit('g')
			setNewMinQuantity('')
			setNewVariants([
				{
					id: 'v0',
					name: 'Crudo',
					isDefault: true,
					calories: '',
					protein: '',
					carbs: '',
					fat: '',
					fiber: '',
				},
			])
			setShowConversions(false)
			setNewConversions([])
			setNewPreferredUnit('')
			setProposeOnCreate(false)
			setActiveStoreIds([])
			setStoreOrderIndifferent(false)
			setNewTagIds([])
			setCreatingNewTag(false)
			setNewTagInput('')
			setBulkRows([{ id: 'b0', name: '', unit: 'g' }])
		}
	}, [isOpen, ingredient, thresholdData])

	// Sincronizar estado de tiendas cuando se cargan (modo edicion)
	useEffect(() => {
		if (!isOpen || !ingredient) return
		const active = allStores
			.filter((s) => s.ingredients?.some((si) => si.ingredientId === ingredient.id))
			.sort((a, b) => {
				const aOrd =
					a.ingredients?.find((si) => si.ingredientId === ingredient.id)?.sortOrder ?? Infinity
				const bOrd =
					b.ingredients?.find((si) => si.ingredientId === ingredient.id)?.sortOrder ?? Infinity
				return aOrd - bOrd
			})
			.map((s) => s.id)
		setActiveStoreIds(active)
		const anyOrdered = allStores.some(
			(s) =>
				(s.ingredients?.find((si) => si.ingredientId === ingredient.id)?.sortOrder ?? null) !== null
		)
		setStoreOrderIndifferent(active.length > 0 && !anyOrdered)
	}, [allStores, isOpen, ingredient?.id]) // eslint-disable-line react-hooks/exhaustive-deps

	// --- Helpers creacion ---
	const getDefaultConversions = (unit: 'g' | 'ml'): ConversionDraft[] =>
		unit === 'g'
			? [{ unitName: 'kg', gramsPerUnit: '1000' }]
			: [{ unitName: 'L', gramsPerUnit: '1000' }]

	const handleUnitChange = (unit: 'g' | 'ml') => {
		setNewUnit(unit)
		if (showConversions) setNewConversions(getDefaultConversions(unit))
	}

	const updateVariantRow = (id: string, field: keyof VariantDraft, value: string | boolean) => {
		setNewVariants((prev) =>
			prev.map((v) => {
				if (v.id === id) {
					if (field === 'isDefault' && value === true) return { ...v, isDefault: true }
					return { ...v, [field]: value }
				}
				if (field === 'isDefault' && value === true) return { ...v, isDefault: false }
				return v
			})
		)
	}

	// --- Accion: crear tag inline (modo creacion) ---
	const handleCreateTagInline = async () => {
		const name = newTagInput.trim()
		if (!name) return
		try {
			const created = await ingredientTagService.create({ name })
			setAllTags((prev) => [...prev, created])
			setNewTagIds((prev) => [...prev, created.id])
			setNewTagInput('')
			setCreatingNewTag(false)
		} catch {
			// silencioso
		}
	}

	// --- Accion: crear uno ---
	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!name.trim()) return

		const validVariants = newVariants
			.filter((v) => v.name.trim())
			.map((v) => ({
				name: v.name.trim(),
				isDefault: v.isDefault,
				calories: v.calories ? Number(v.calories) : undefined,
				protein: v.protein ? Number(v.protein) : undefined,
				carbs: v.carbs ? Number(v.carbs) : undefined,
				fat: v.fat ? Number(v.fat) : undefined,
				fiber: v.fiber ? Number(v.fiber) : undefined,
			}))
		if (validVariants.length === 0) {
			validVariants.push({
				name: 'Crudo',
				isDefault: true,
				calories: undefined,
				protein: undefined,
				carbs: undefined,
				fat: undefined,
				fiber: undefined,
			})
		}
		if (!validVariants.some((v) => v.isDefault)) validVariants[0].isDefault = true

		try {
			const created = await ingredientService.create({
				name: name.charAt(0).toUpperCase() + name.slice(1),
				unit: newUnit,
				imageUrl: imageUrl || undefined,
				defaultLocation: location || undefined,
				variants: validVariants,
			})

			const defaultConv =
				newUnit === 'g'
					? { unitName: 'kg', gramsPerUnit: 1000 }
					: { unitName: 'L', gramsPerUnit: 1000 }
			await ingredientService.addConversion(created.id, defaultConv)

			const validConvs = newConversions.filter(
				(c) =>
					c.unitName.trim() &&
					c.gramsPerUnit &&
					c.unitName.trim().toLowerCase() !== defaultConv.unitName.toLowerCase()
			)
			for (const c of validConvs) {
				await ingredientService.addConversion(created.id, {
					unitName: c.unitName.trim(),
					gramsPerUnit: Number(c.gramsPerUnit),
				})
			}

			if (newMinQuantity && Number(newMinQuantity) > 0) {
				await alertService.setIngredientThreshold({
					ingredientId: created.id,
					minQuantity: Number(newMinQuantity),
					unit: newUnit,
				})
			}

			if (newPreferredUnit) {
				await ingredientService.update(created.id, { preferredUnit: newPreferredUnit })
			}

			for (const [i, storeId] of activeStoreIds.entries()) {
				const sortOrder = storeOrderIndifferent ? null : i + 1
				try {
					await storeService.addIngredient(storeId, { ingredientId: created.id, sortOrder })
				} catch {
					/* ignorar si falla una tienda */
				}
			}

			for (const tagId of newTagIds) {
				try {
					await ingredientTagService.assign(created.id, tagId)
				} catch {
					/* ignorar si falla una tag */
				}
			}

			// Si el usuario quiere proponer el ingrediente al admin, cambiarlo a PENDING
			if (proposeOnCreate && created.status === 'PRIVATE') {
				try {
					await ingredientService.propose(created.id)
					toast.success(t('ingredients.createdPending'))
				} catch {
					toast.success(t('ingredients.created'))
				}
			} else {
				toast.success(t('ingredients.created'))
			}
			onSaved()
			onClose()
		} catch {
			toast.error(t('ingredients.createError'))
		}
	}

	// --- Accion: crear varios ---
	const handleBulkCreate = async (e: React.FormEvent) => {
		e.preventDefault()
		const valid = bulkRows
			.filter((r) => r.name.trim())
			.map((r) => ({
				name: r.name.charAt(0).toUpperCase() + r.name.slice(1),
				unit: r.unit,
			}))
		if (valid.length === 0) return
		setBulkCreating(true)
		try {
			await ingredientService.createBulk(valid)
			toast.success(`${valid.length} ${t('ingredients.bulkCreated')}`)
			onSaved()
			onClose()
		} catch {
			toast.error(t('ingredients.bulkCreateError'))
		} finally {
			setBulkCreating(false)
		}
	}

	// --- Accion: guardar basico (edicion) ---
	const handleSaveBasic = async () => {
		if (!ingredient) return
		setSavingBasic(true)
		try {
			await ingredientService.update(ingredient.id, {
				name: name.charAt(0).toUpperCase() + name.slice(1),
				imageUrl: imageUrl || null,
				defaultLocation: location || null,
			})
			toast.success(t('ingredients.updated'))
			onSaved()
		} catch {
			toast.error(t('ingredients.updateError'))
		} finally {
			setSavingBasic(false)
		}
	}

	// --- Variante inline (edicion) ---
	const cancelEditVariant = () => {
		setEditingVariantId(null)
		setVName('')
		setVCalories('')
		setVProtein('')
		setVCarbs('')
		setVFat('')
		setVFiber('')
	}
	const startEditVariant = (v: IngredientVariant) => {
		setEditingVariantId(v.id)
		setVName(v.name)
		setVCalories(v.calories?.toString() ?? '')
		setVProtein(v.protein?.toString() ?? '')
		setVCarbs(v.carbs?.toString() ?? '')
		setVFat(v.fat?.toString() ?? '')
		setVFiber(v.fiber?.toString() ?? '')
		setAddingVariant(false)
	}
	const startAddVariant = () => {
		setAddingVariant(true)
		setEditingVariantId(null)
		setVName('')
		setVCalories('')
		setVProtein('')
		setVCarbs('')
		setVFat('')
		setVFiber('')
	}
	const saveVariant = async (variantId: number) => {
		if (!vName.trim()) return
		try {
			const updated = await ingredientService.updateVariant(variantId, {
				name: vName.trim(),
				calories: vCalories === '' ? null : Number(vCalories),
				protein: vProtein === '' ? null : Number(vProtein),
				carbs: vCarbs === '' ? null : Number(vCarbs),
				fat: vFat === '' ? null : Number(vFat),
				fiber: vFiber === '' ? null : Number(vFiber),
			})
			setLocalVariants((prev) => prev.map((v) => (v.id === variantId ? updated : v)))
			cancelEditVariant()
		} catch {
			toast.error(t('ingredients.updateError'))
		}
	}
	const deleteVariant = async (variantId: number) => {
		try {
			await ingredientService.deleteVariant(variantId)
			setLocalVariants((prev) => prev.filter((v) => v.id !== variantId))
		} catch {
			toast.error(t('ingredients.updateError'))
		}
	}
	const setAsDefault = async (variantId: number) => {
		try {
			await ingredientService.updateVariant(variantId, { isDefault: true })
			setLocalVariants((prev) => prev.map((v) => ({ ...v, isDefault: v.id === variantId })))
		} catch {
			toast.error(t('ingredients.updateError'))
		}
	}
	const addNewVariant = async () => {
		if (!ingredient || !vName.trim()) return
		try {
			const created = await ingredientService.addVariant(ingredient.id, {
				name: vName.trim(),
				calories: vCalories === '' ? undefined : Number(vCalories),
				protein: vProtein === '' ? undefined : Number(vProtein),
				carbs: vCarbs === '' ? undefined : Number(vCarbs),
				fat: vFat === '' ? undefined : Number(vFat),
				fiber: vFiber === '' ? undefined : Number(vFiber),
			})
			setLocalVariants((prev) => [...prev, created])
			setAddingVariant(false)
			cancelEditVariant()
		} catch {
			toast.error(t('ingredients.updateError'))
		}
	}

	// --- Conversiones (edicion) ---
	const handleAddConversion = async () => {
		if (!ingredient || !newConvUnit.trim() || !newConvGrams) return
		try {
			const created = await ingredientService.addConversion(ingredient.id, {
				unitName: newConvUnit.trim(),
				gramsPerUnit: Number(newConvGrams),
			})
			setLocalConversions((prev) => [...prev, created])
			setNewConvUnit('')
			setNewConvGrams('')
		} catch {
			toast.error(t('ingredients.updateError'))
		}
	}
	const handleDeleteConversion = async (conv: UnitConversion) => {
		try {
			if (conv.isUserOverride) {
				await ingredientService.deleteConversionOverride(conv.id)
			} else {
				await ingredientService.deleteConversion(conv.id)
			}
			setLocalConversions((prev) => prev.filter((c) => c.id !== conv.id))
		} catch {
			toast.error(t('ingredients.updateError'))
		}
	}

	// --- Propuesta al admin ---
	const handlePropose = async () => {
		if (!ingredient) return
		setSendingProposal(true)
		try {
			if (proposalType === 'NEW_CONVERSION') {
				if (!proposalConvUnit.trim() || !proposalConvGrams) return
				await ingredientProposalService.create({
					type: 'NEW_CONVERSION',
					ingredientId: ingredient.id,
					proposedValue: {
						unitName: proposalConvUnit.trim(),
						gramsPerUnit: Number(proposalConvGrams),
					},
				})
			} else {
				// EDIT_FIELD
				const currentVal = proposalField === 'name' ? ingredient.name : ingredient.imageUrl
				await ingredientProposalService.create({
					type: 'EDIT_FIELD',
					ingredientId: ingredient.id,
					fieldName: proposalField,
					currentValue: currentVal,
					proposedValue: proposalValue.trim(),
				})
			}
			toast.success(t('ingredients.proposalSent'))
			setShowProposalForm(false)
			setProposalValue('')
			setProposalConvUnit('')
			setProposalConvGrams('')
		} catch {
			toast.error(t('ingredients.proposalError'))
		} finally {
			setSendingProposal(false)
		}
	}

	// --- Proponer conversión personal al admin (tipo quick-action desde el item) ---
	const handleProposeConversion = async (conv: UnitConversion) => {
		if (!ingredient) return
		try {
			await ingredientProposalService.create({
				type: 'NEW_CONVERSION',
				ingredientId: ingredient.id,
				proposedValue: { unitName: conv.unitName, gramsPerUnit: conv.gramsPerUnit },
			})
			toast.success(t('ingredients.proposalSent'))
			setConvMenuOpenId(null)
		} catch {
			toast.error(t('ingredients.proposalError'))
		}
	}

	// --- Proponer ingrediente PRIVATE al admin desde modo edición ---
	const [proposingIngredient, setProposingIngredient] = useState(false)
	const handleProposeExisting = async () => {
		if (!ingredient) return
		setProposingIngredient(true)
		try {
			const updated = await ingredientService.propose(ingredient.id)
			toast.success(t('ingredients.createdPending'))
			onSaved()
			// El ingrediente ya no es PRIVATE — refrescar los datos locales
			if (updated) {
				ingredient.status = updated.status
			}
		} catch {
			toast.error(t('ingredients.proposalError'))
		} finally {
			setProposingIngredient(false)
		}
	}

	// --- Tiendas (edicion) ---
	const handleToggleStoreEdit = async (storeId: number) => {
		if (!ingredient) return
		const isActive = activeStoreIds.includes(storeId)
		try {
			if (isActive) {
				await storeService.removeIngredient(storeId, ingredient.id)
				setActiveStoreIds((prev) => prev.filter((id) => id !== storeId))
			} else {
				const sortOrder = storeOrderIndifferent ? null : activeStoreIds.length + 1
				await storeService.addIngredient(storeId, { ingredientId: ingredient.id, sortOrder })
				setActiveStoreIds((prev) => [...prev, storeId])
			}
			const updated = await storeService.getAll()
			setAllStores(updated)
			onSaved()
		} catch {
			toast.error(t('ingredients.updateError'))
		}
	}

	const handleReorderEdit = async (newIds: number[]) => {
		if (!ingredient || storeOrderIndifferent) {
			setActiveStoreIds(newIds)
			return
		}
		setActiveStoreIds(newIds)
		try {
			for (const [i, storeId] of newIds.entries()) {
				await storeService.addIngredient(storeId, { ingredientId: ingredient.id, sortOrder: i + 1 })
			}
			const updated = await storeService.getAll()
			setAllStores(updated)
			onSaved()
		} catch {
			toast.error(t('ingredients.updateError'))
		}
	}

	const handleIndifferentEdit = async (value: boolean) => {
		if (!ingredient) return
		setStoreOrderIndifferent(value)
		try {
			for (const [i, storeId] of activeStoreIds.entries()) {
				const sortOrder = value ? null : i + 1
				await storeService.addIngredient(storeId, { ingredientId: ingredient.id, sortOrder })
			}
			const updated = await storeService.getAll()
			setAllStores(updated)
			onSaved()
		} catch {
			toast.error(t('ingredients.updateError'))
		}
	}

	// --- Umbral (edicion) ---
	const handleSaveThreshold = async () => {
		if (!ingredient) return
		const min = Number(minQuantity)
		if (!min || min <= 0) return
		try {
			await alertService.setIngredientThreshold({
				ingredientId: ingredient.id,
				minQuantity: min,
				unit: minUnit,
			})
			setHasThreshold(true)
			onSaved()
		} catch {
			toast.error(t('ingredients.updateError'))
		}
	}
	const handleDeleteThreshold = async () => {
		if (!ingredient) return
		try {
			await alertService.deleteIngredientThreshold(ingredient.id)
			setMinQuantity('')
			setMinUnit(ingredient.unit ?? 'g')
			setHasThreshold(false)
			onSaved()
		} catch {
			toast.error(t('ingredients.updateError'))
		}
	}

	// --- UI: formulario de macros inline ---
	const macroInputRow = (onSave: () => void, onCancel: () => void, isNew = false) => (
		<div className='ifm-variant-form'>
			<input
				className='form-input form-input-sm ifm-variant-name'
				placeholder={t('ingredients.variantsPlaceholder')}
				value={vName}
				onChange={(e) => setVName(e.target.value)}
				autoFocus
			/>
			<div className='ifm-macros-grid'>
				{(
					[
						['weekPlan.kcal', vCalories, setVCalories],
						['weekPlan.prot', vProtein, setVProtein],
						['weekPlan.carbsShort', vCarbs, setVCarbs],
						['weekPlan.fatShort', vFat, setVFat],
						['fiber', vFiber, setVFiber],
					] as [string, string, (v: string) => void][]
				).map(([label, val, setter]) => (
					<div key={label} className='ifm-macro-cell'>
						<span className='ifm-macro-label'>{t(label)}</span>
						<input
							type='number'
							className='form-input form-input-sm'
							placeholder='0'
							value={val}
							onChange={(e) => setter(e.target.value)}
							min={0}
							step={0.1}
						/>
					</div>
				))}
			</div>
			<div className='ifm-variant-form-actions'>
				<button className='btn btn-sm btn-outline' type='button' onClick={onCancel}>
					{t('cancel')}
				</button>
				<button
					className='btn btn-sm btn-primary'
					type='button'
					onClick={onSave}
					disabled={!vName.trim()}>
					{isNew ? t('add') : t('save')}
				</button>
			</div>
		</div>
	)

	// --- Render ---
	const unit = isEdit ? ingredient.unit : newUnit
	const conversions = isEdit ? localConversions : newConversions.filter((c) => c.unitName.trim())
	const modalTitle = isEdit
		? `${t('edit')}: ${ingredient.name.charAt(0).toUpperCase() + ingredient.name.slice(1)}`
		: t('ingredients.new')

	return (
		<div className='ifm-wrapper'>
			<Modal
				isOpen={isOpen}
				onClose={autoSaveOnClose && isEdit ? handleSaveBasic : onClose}
				title={modalTitle}>
				{/* Selector modo creacion: uno / varios */}
				{!isEdit && (
					<div className='ifm-mode-toggle'>
						<button
							type='button'
							className={`ifm-mode-btn${addMode === 'single' ? ' active' : ''}`}
							onClick={() => setAddMode('single')}>
							{t('ingredients.single')}
						</button>
						<button
							type='button'
							className={`ifm-mode-btn${addMode === 'multiple' ? ' active' : ''}`}
							onClick={() => setAddMode('multiple')}>
							{t('ingredients.multiple')}
						</button>
					</div>
				)}

				{/* Modo bulk (solo creacion) */}
				{!isEdit && addMode === 'multiple' && (
					<form onSubmit={handleBulkCreate} className='ifm-form'>
						<p className='ifm-hint'>{t('ingredients.bulkHint')}</p>
						<div className='ifm-bulk-list'>
							{bulkRows.map((row, index) => (
								<div key={row.id} className='ifm-bulk-row'>
									<span className='ifm-bulk-num'>{index + 1}</span>
									<input
										type='text'
										className='form-input'
										placeholder={t('ingredients.namePlaceholder')}
										value={row.name}
										onChange={(e) =>
											setBulkRows((prev) =>
												prev.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r))
											)
										}
										onKeyDown={(e) => {
											if (e.key === 'Enter') {
												e.preventDefault()
												if (index === bulkRows.length - 1) {
													setBulkRows((prev) => [
														...prev,
														{ id: `b${Date.now()}`, name: '', unit: 'g' },
													])
												}
											}
										}}
										autoFocus={index === bulkRows.length - 1}
									/>
									<select
										className='form-input ifm-unit-select'
										value={row.unit}
										onChange={(e) =>
											setBulkRows((prev) =>
												prev.map((r) =>
													r.id === row.id ? { ...r, unit: e.target.value as 'g' | 'ml' } : r
												)
											)
										}>
										{BASE_UNITS.map((u) => (
											<option key={u} value={u}>
												{u}
											</option>
										))}
									</select>
									<button
										type='button'
										className='btn-icon-small'
										onClick={() =>
											setBulkRows((prev) =>
												prev.length > 1 ? prev.filter((r) => r.id !== row.id) : prev
											)
										}
										disabled={bulkRows.length === 1}>
										<CloseIcon size={14} aria-hidden='true' />
									</button>
								</div>
							))}
						</div>
						<button
							type='button'
							className='btn btn-outline btn-sm ifm-add-bulk'
							onClick={() =>
								setBulkRows((prev) => [...prev, { id: `b${Date.now()}`, name: '', unit: 'g' }])
							}>
							{t('ingredients.addAnother')}
						</button>
						<div className='ifm-actions'>
							<button type='button' className='btn btn-outline' onClick={onClose}>
								{t('cancel')}
							</button>
							<button
								type='submit'
								className='btn btn-primary'
								disabled={bulkCreating || !bulkRows.some((r) => r.name.trim())}>
								{bulkCreating
									? t('loading')
									: t('ingredients.createCount', {
											count: bulkRows.filter((r) => r.name.trim()).length,
										})}
							</button>
						</div>
					</form>
				)}

				{/* Formulario principal (single creacion + edicion) */}
				{(isEdit || addMode === 'single') && (
					<form
						onSubmit={!isEdit ? handleCreate : (e) => e.preventDefault()}
						className={isEdit ? 'ifm-edit-form' : 'ifm-form'}>
						{/* Aviso para usuario normal sobre cambios personales (ingrediente GLOBAL) */}
						{isEdit && !isUserAdmin && isGlobalIngredient && (
							<div className='ifm-personal-notice'>
								<span>ℹ️ {t('ingredients.personalChangesNotice')}</span>
							</div>
						)}

						{/* Banner proponer al admin — ingrediente PRIVATE del propio usuario */}
						{isEdit && !isUserAdmin && ingredient.status === 'PRIVATE' && (
							<div className='ifm-propose-banner'>
								<div className='ifm-propose-banner__text'>
									<strong>{t('ingredients.privateIngredient')}</strong>
									<span>{t('ingredients.privateIngredientHint')}</span>
								</div>
								<button
									type='button'
									className='btn btn-sm btn-secondary'
									disabled={proposingIngredient}
									onClick={handleProposeExisting}>
									{proposingIngredient ? t('loading') : t('ingredients.proposeToAdmin')}
								</button>
							</div>
						)}

						{/* Nombre, imagen, ubicacion */}
						<div className={isEdit ? 'ifm-edit-section' : undefined}>
							<BasicFields
								name={name}
								onNameChange={setName}
								imageUrl={imageUrl}
								onImageUrlChange={setImageUrl}
								location={location}
								onLocationChange={setLocation}
								unit={unit}
								onUnitChange={!isEdit ? handleUnitChange : undefined}
								onSave={isEdit ? handleSaveBasic : undefined}
								saving={savingBasic}
								readonlyName={forceReadonlyName || (isEdit && !isUserAdmin && isGlobalIngredient)}
							/>
						</div>

						{/* Cantidad minima */}
						<div className={isEdit ? 'ifm-edit-section' : 'ifm-section'}>
							<p className='ifm-section-label'>
								{t('ingredients.minQuantity')}
								{isEdit && hasThreshold && <span className='ifm-threshold-ok'> ✓</span>}
							</p>
							<p className='ifm-hint'>{t('ingredients.minQuantityHint')}</p>
							{isEdit ? (
								<div className='ifm-threshold-row'>
									<input
										type='number'
										className='form-input form-input-sm'
										placeholder='0'
										value={minQuantity}
										onChange={(e) => setMinQuantity(e.target.value)}
										min={0}
										step={0.1}
									/>
									<select
										className='form-input form-input-sm'
										value={minUnit}
										onChange={(e) => setMinUnit(e.target.value)}>
										<option value={unit}>{unit}</option>
										{localConversions.map((c) => (
											<option key={c.id} value={c.unitName}>
												{c.unitName}
											</option>
										))}
									</select>
									<button
										type='button'
										className='btn btn-sm btn-primary'
										disabled={!minQuantity || Number(minQuantity) <= 0}
										onClick={handleSaveThreshold}>
										{t('save')}
									</button>
									{hasThreshold && (
										<button
											type='button'
											className='btn btn-sm btn-outline'
											onClick={handleDeleteThreshold}
											title={t('ingredients.removeThreshold')}>
											×
										</button>
									)}
								</div>
							) : (
								<div className='ifm-row'>
									<input
										type='number'
										className='form-input'
										placeholder={t('ingredients.quantityPlaceholder')}
										value={newMinQuantity}
										onChange={(e) => setNewMinQuantity(e.target.value)}
										min={0}
										step={1}
									/>
									<span className='ifm-unit-label'>{unit}</span>
								</div>
							)}
						</div>

						{/* Variantes / estados */}
						<div className={isEdit ? 'ifm-edit-section' : 'ifm-section'}>
							<p className='ifm-section-label'>
								{t('ingredients.statesToggle', {
									count: isEdit ? localVariants.length : newVariants.length,
								})}
								<span className='ifm-section-hint'> — {t('ingredients.statesHint', { unit })}</span>
							</p>

							{isEdit ? (
								<>
									{localVariants.map((variant) => (
										<div key={variant.id}>
											{editingVariantId === variant.id ? (
												macroInputRow(() => saveVariant(variant.id), cancelEditVariant, false)
											) : (
												<div className={`ifm-variant-row${variant.isDefault ? ' is-default' : ''}`}>
													<div className='ifm-variant-info'>
														<span className='ifm-variant-name'>{variant.name}</span>
														{variant.isDefault && (
															<span className='ifm-variant-default-badge'>{t('default')}</span>
														)}
														<span className='ifm-variant-macros'>
															{[
																variant.calories != null && `${variant.calories}kcal`,
																variant.protein != null && `${variant.protein}g P`,
																variant.carbs != null && `${variant.carbs}g C`,
																variant.fat != null && `${variant.fat}g G`,
															]
																.filter(Boolean)
																.join(' · ') || t('ingredients.noNutrition')}
														</span>
													</div>
													<div className='ifm-variant-actions'>
														{!variant.isDefault && (
															<button
																className='btn-icon-small'
																type='button'
																title={t('ingredients.setDefaultTitle')}
																onClick={() => setAsDefault(variant.id)}>
																<StarIcon size={12} aria-hidden='true' />
															</button>
														)}
														<button
															className='btn-icon-small'
															type='button'
															title={t('edit')}
															onClick={() => startEditVariant(variant)}>
															<EditIcon size={12} aria-hidden='true' />
														</button>
														{localVariants.length > 1 && (
															<button
																className='btn-icon-small btn-danger'
																type='button'
																title={t('delete')}
																onClick={() => deleteVariant(variant.id)}>
																<DeleteIcon size={12} aria-hidden='true' />
															</button>
														)}
													</div>
												</div>
											)}
										</div>
									))}
									{addingVariant ? (
										macroInputRow(addNewVariant, () => setAddingVariant(false), true)
									) : (
										<button
											type='button'
											className='btn btn-sm btn-outline ifm-add-state-btn'
											onClick={startAddVariant}>
											{t('ingredients.addState')}
										</button>
									)}
								</>
							) : (
								<>
									{newVariants.map((variant) => (
										<div key={variant.id} className='ifm-new-variant'>
											<div className='ifm-row ifm-variant-header-row'>
												<button
													type='button'
													className={`btn-icon-small${variant.isDefault ? ' is-default-star' : ''}`}
													title={t('ingredients.setDefaultTitle')}
													onClick={() => updateVariantRow(variant.id, 'isDefault', true)}>
													<StarIcon size={12} aria-hidden='true' />
												</button>
												<input
													type='text'
													className='form-input ifm-input-name'
													placeholder={t('ingredients.variantsPlaceholder')}
													value={variant.name}
													onChange={(e) => updateVariantRow(variant.id, 'name', e.target.value)}
												/>
												{newVariants.length > 1 && (
													<button
														type='button'
														className='btn-icon-small'
														onClick={() =>
															setNewVariants((prev) => prev.filter((v) => v.id !== variant.id))
														}>
														<CloseIcon size={13} aria-hidden='true' />
													</button>
												)}
											</div>
											<div className='ifm-macros-row'>
												{(['calories', 'protein', 'carbs', 'fat', 'fiber'] as const).map(
													(field) => (
														<div key={field} className='ifm-macro-cell'>
															<span className='ifm-macro-label'>
																{field === 'calories'
																	? t('weekPlan.kcal')
																	: field === 'protein'
																		? t('weekPlan.prot')
																		: field === 'carbs'
																			? t('weekPlan.carbsShort')
																			: field === 'fat'
																				? t('weekPlan.fatShort')
																				: t('fiber')}
															</span>
															<input
																type='number'
																className='form-input'
																placeholder='0'
																value={variant[field]}
																onChange={(e) =>
																	updateVariantRow(variant.id, field, e.target.value)
																}
																min={0}
																step={0.1}
															/>
														</div>
													)
												)}
											</div>
										</div>
									))}
									<button
										type='button'
										className='btn btn-sm btn-outline'
										onClick={() =>
											setNewVariants((prev) => [
												...prev,
												{
													id: `v${Date.now()}`,
													name: '',
													isDefault: false,
													calories: '',
													protein: '',
													carbs: '',
													fat: '',
													fiber: '',
												},
											])
										}>
										{t('ingredients.addState')}
									</button>
								</>
							)}
						</div>

						{/* Conversiones */}
						<div className={isEdit ? 'ifm-edit-section' : 'ifm-section'}>
							{isEdit ? (
								<>
									<p className='ifm-section-label'>
										{t('ingredients.conversionsToggle', { count: localConversions.length })}
									</p>
									{localConversions.map((conv) => (
										<div key={conv.id} className='ifm-conv-item'>
											<span className='ifm-conv-text'>
												1 {conv.unitName} = {conv.gramsPerUnit}
												{unit}
											</span>
											<div className='ifm-conv-actions'>
												{conv.isUserOverride && !isUserAdmin && (
													<div className='ifm-conv-menu'>
														<button
															className='btn-icon-small ifm-conv-menu-btn'
															type='button'
															title={t('ingredients.moreOptions')}
															onClick={() =>
																setConvMenuOpenId(convMenuOpenId === conv.id ? null : conv.id)
															}>
															⋯
														</button>
														{convMenuOpenId === conv.id && (
															<div className='ifm-conv-menu-dropdown'>
																<button
																	type='button'
																	className='ifm-conv-menu-item'
																	onClick={() => handleProposeConversion(conv)}>
																	{t('ingredients.proposeGlobal')}
																</button>
															</div>
														)}
													</div>
												)}
												<button
													className='btn-icon-small btn-danger'
													type='button'
													title={t('delete')}
													onClick={() => handleDeleteConversion(conv)}>
													<DeleteIcon size={12} aria-hidden='true' />
												</button>
											</div>
										</div>
									))}
									<div className='ifm-conv-add-row'>
										<span className='ifm-conv-prefix'>1</span>
										<input
											type='text'
											className='form-input form-input-sm ifm-conv-name'
											placeholder={t('ingredients.unitHeader')}
											value={newConvUnit}
											onChange={(e) => setNewConvUnit(e.target.value)}
										/>
										<span className='ifm-conv-eq'>=</span>
										<input
											type='number'
											className='form-input form-input-sm ifm-conv-val'
											placeholder={unit}
											value={newConvGrams}
											onChange={(e) => setNewConvGrams(e.target.value)}
											min={0}
											step={0.1}
										/>
										<span className='ifm-conv-suffix'>{unit}</span>
										<button
											type='button'
											className='btn btn-sm btn-primary'
											disabled={!newConvUnit.trim() || !newConvGrams}
											onClick={handleAddConversion}>
											+
										</button>
									</div>
								</>
							) : (
								<>
									<button
										type='button'
										className='ifm-toggle-btn'
										onClick={() => {
											if (!showConversions) setNewConversions(getDefaultConversions(newUnit))
											setShowConversions(!showConversions)
										}}>
										{showConversions ? '▼' : '▶'} {t('recipes.unitConversions')}
									</button>
									{showConversions && (
										<div className='ifm-conversions-block'>
											<p className='ifm-hint'>
												Define equivalencias (ej: 1&nbsp;
												{newUnit === 'g' ? 'kg = 1000g' : 'L = 1000ml'})
											</p>
											{newConversions.map((conv, i) => (
												<div key={i} className='ifm-conv-row'>
													<span className='ifm-conv-prefix'>1</span>
													<input
														type='text'
														className='form-input ifm-conv-name'
														placeholder={newUnit === 'g' ? 'kg, cucharada...' : 'L, vaso...'}
														value={conv.unitName}
														onChange={(e) =>
															setNewConversions((prev) => {
																const c = [...prev]
																c[i].unitName = e.target.value
																return c
															})
														}
													/>
													<span className='ifm-conv-eq'>=</span>
													<input
														type='number'
														className='form-input ifm-conv-val'
														placeholder='1000'
														value={conv.gramsPerUnit}
														onChange={(e) =>
															setNewConversions((prev) => {
																const c = [...prev]
																c[i].gramsPerUnit = e.target.value
																return c
															})
														}
														min={0}
														step={0.1}
													/>
													<span className='ifm-conv-suffix'>{newUnit}</span>
													<button
														type='button'
														className='btn-icon-small'
														onClick={() =>
															setNewConversions((prev) => prev.filter((_, idx) => idx !== i))
														}>
														<CloseIcon size={14} aria-hidden='true' />
													</button>
												</div>
											))}
											<button
												type='button'
												className='btn btn-outline btn-sm'
												onClick={() =>
													setNewConversions((prev) => [...prev, { unitName: '', gramsPerUnit: '' }])
												}>
												{t('ingredients.addConversion')}
											</button>
										</div>
									)}
								</>
							)}

							{/* Unidad preferida */}
							{conversions.length > 0 && (
								<div className={isEdit ? 'ifm-preferred-unit' : 'ifm-section'}>
									{isEdit ? (
										<span className='ifm-preferred-label'>{t('ingredients.preferredUnit')}</span>
									) : (
										<p className='ifm-section-label'>{t('ingredients.preferredUnit')}</p>
									)}
									<select
										className='form-input form-input-sm'
										value={isEdit ? preferredUnit : newPreferredUnit}
										onChange={async (e) => {
											const val = e.target.value
											if (isEdit) {
												setPreferredUnit(val)
												try {
													await ingredientService.update(ingredient.id, {
														preferredUnit: val || null,
													})
													onSaved()
												} catch {
													toast.error(t('ingredients.updateError'))
												}
											} else {
												setNewPreferredUnit(val)
											}
										}}>
										<option value=''>
											{unit} ({t('default')})
										</option>
										{conversions.map((c, i) => (
											<option key={'id' in c ? c.id : i} value={c.unitName}>
												{c.unitName}
											</option>
										))}
									</select>
								</div>
							)}
						</div>

						{/* Tiendas */}
						<div className={isEdit ? 'ifm-edit-section' : 'ifm-section'}>
							<p className='ifm-section-label'>{t('ingredients.storesSection')}</p>
							<StoresSection
								allStores={allStores}
								activeStoreIds={activeStoreIds}
								indifferent={storeOrderIndifferent}
								onToggleStore={
									isEdit
										? handleToggleStoreEdit
										: (storeId) =>
												setActiveStoreIds((prev) =>
													prev.includes(storeId)
														? prev.filter((id) => id !== storeId)
														: [...prev, storeId]
												)
								}
								onReorder={isEdit ? handleReorderEdit : setActiveStoreIds}
								onIndifferentChange={isEdit ? handleIndifferentEdit : setStoreOrderIndifferent}
							/>
						</div>

						{/* Etiquetas */}
						<div className={isEdit ? 'ifm-edit-section' : 'ifm-section'}>
							<p className='ifm-section-label'>{t('tags.title')}</p>
							{isEdit ? (
								<IngredientTagsPanel ingredientId={ingredient.id} />
							) : (
								<>
									<div className='ing-tags-panel__list'>
										{allTags.length === 0 ? (
											<span className='ing-tags-panel__empty'>{t('tags.noTags')}</span>
										) : (
											allTags.map((tag) => (
												<button
													key={tag.id}
													type='button'
													className={`ing-tags-panel__chip${newTagIds.includes(tag.id) ? ' ing-tags-panel__chip--active' : ''}`}
													style={
														tag.color
															? {
																	borderColor: tag.color,
																	...(newTagIds.includes(tag.id) ? { background: tag.color } : {}),
																}
															: {}
													}
													onClick={() =>
														setNewTagIds((prev) =>
															prev.includes(tag.id)
																? prev.filter((id) => id !== tag.id)
																: [...prev, tag.id]
														)
													}>
													{tag.name}
													{tag.isGlobal && <span className='ing-tags-panel__chip-badge'>G</span>}
												</button>
											))
										)}
									</div>
									{creatingNewTag ? (
										<div className='ing-tags-panel__create'>
											<input
												type='text'
												value={newTagInput}
												onChange={(e) => setNewTagInput(e.target.value)}
												placeholder={t('tags.name')}
												className='ing-tags-panel__input'
												autoFocus
												onKeyDown={(e) => e.key === 'Enter' && handleCreateTagInline()}
											/>
											<button
												type='button'
												className='ing-tags-panel__btn-create'
												onClick={handleCreateTagInline}>
												{t('save')}
											</button>
											<button
												type='button'
												className='ing-tags-panel__btn-cancel'
												onClick={() => setCreatingNewTag(false)}>
												{t('cancel')}
											</button>
										</div>
									) : (
										<button
											type='button'
											className='ing-tags-panel__btn-add'
											onClick={() => setCreatingNewTag(true)}>
											+ {t('tags.add')}
										</button>
									)}
								</>
							)}
						</div>

						{/* Sección propuesta al admin (solo para usuarios normales en ingredientes GLOBAL) */}
						{isEdit && !isUserAdmin && isGlobalIngredient && (
							<div className='ifm-edit-section'>
								<button
									type='button'
									className='ifm-proposal-toggle'
									onClick={() => setShowProposalForm((v) => !v)}>
									{showProposalForm ? '▼' : '▶'} {t('ingredients.proposeChange')}
								</button>
								{showProposalForm && (
									<div className='ifm-proposal-form'>
										<p className='ifm-hint'>{t('ingredients.proposeHint')}</p>

										{/* Tipo de propuesta */}
										<div className='ifm-row'>
											<select
												className='form-input'
												value={proposalType}
												onChange={(e) => {
													setProposalType(e.target.value as ProposalType)
													setProposalValue('')
													setProposalField('name')
												}}>
												<option value='EDIT_FIELD'>{t('ingredients.proposalTypeEditField')}</option>
												<option value='NEW_CONVERSION'>
													{t('ingredients.proposalTypeNewConversion')}
												</option>
											</select>
										</div>

										{proposalType === 'EDIT_FIELD' && (
											<>
												<div className='ifm-row'>
													<select
														className='form-input form-input-sm'
														value={proposalField}
														onChange={(e) => setProposalField(e.target.value)}>
														<option value='name'>{t('ingredients.namePlaceholder')}</option>
														<option value='imageUrl'>{t('ingredients.imageUrlPlaceholder')}</option>
													</select>
												</div>
												<input
													type='text'
													className='form-input'
													placeholder={t('ingredients.proposeValuePlaceholder')}
													value={proposalValue}
													onChange={(e) => setProposalValue(e.target.value)}
												/>
											</>
										)}

										{proposalType === 'NEW_CONVERSION' && (
											<div className='ifm-conv-add-row'>
												<span className='ifm-conv-prefix'>1</span>
												<input
													type='text'
													className='form-input form-input-sm ifm-conv-name'
													placeholder={t('ingredients.unitHeader')}
													value={proposalConvUnit}
													onChange={(e) => setProposalConvUnit(e.target.value)}
												/>
												<span className='ifm-conv-eq'>=</span>
												<input
													type='number'
													className='form-input form-input-sm ifm-conv-val'
													placeholder={unit}
													value={proposalConvGrams}
													onChange={(e) => setProposalConvGrams(e.target.value)}
													min={0}
													step={0.1}
												/>
												<span className='ifm-conv-suffix'>{unit}</span>
											</div>
										)}

										<div className='ifm-section-save'>
											<button
												type='button'
												className='btn btn-sm btn-secondary'
												disabled={
													sendingProposal ||
													(proposalType === 'EDIT_FIELD' && !proposalValue.trim()) ||
													(proposalType === 'NEW_CONVERSION' &&
														(!proposalConvUnit.trim() || !proposalConvGrams))
												}
												onClick={handlePropose}>
												{sendingProposal ? t('loading') : t('ingredients.proposalSend')}
											</button>
										</div>
									</div>
								)}
							</div>
						)}

						{/* Acciones */}
						<div className={`ifm-actions${isEdit ? ' ifm-actions--edit' : ''}`}>
							{/* Checkbox "proponer al admin" — solo en creación para usuarios normales */}
							{!isEdit && !isUserAdmin && (
								<label className='ifm-propose-check'>
									<input
										type='checkbox'
										checked={proposeOnCreate}
										onChange={(e) => setProposeOnCreate(e.target.checked)}
									/>
									<span>{t('ingredients.proposeOnCreate')}</span>
								</label>
							)}
							<div className='ifm-actions-buttons'>
								<button type='button' className='btn btn-outline' onClick={onClose}>
									{t('cancel')}
								</button>
								{!isEdit && (
									<button type='submit' className='btn btn-primary'>
										{t('ingredients.createBtn')}
									</button>
								)}
							</div>
						</div>
					</form>
				)}
			</Modal>
		</div>
	)
}
