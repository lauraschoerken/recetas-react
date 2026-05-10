import './SettingsContainer.scss'
import '@/components/shared/confirm-dialog/ConfirmDialog.scss'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	HiOutlineCheck,
	HiOutlineEye,
	HiOutlineEyeSlash,
	HiOutlineLink,
	HiOutlinePencil,
	HiOutlinePlus,
	HiOutlineTrash,
	HiOutlineXMark,
} from 'react-icons/hi2'

import { alertService, IngredientThreshold, RecipeThreshold } from '@/services/alert'
import { authService } from '@/services/auth'
import { backupService } from '@/services/backup'
import { Household, householdService } from '@/services/household'
import { IngredientTag, ingredientTagService } from '@/services/ingredientExtras'
import { storeService, UserStore } from '@/services/store'
import { useDialog } from '@/utils/dialog/DialogContext'
import {
	getStoredPageSize,
	getStoredSnoozeDuration,
	PAGE_SIZE_OPTIONS,
	setStoredPageSize,
	setStoredSnoozeDuration,
	SNOOZE_OPTIONS,
} from '@/utils/pagination/usePagination'

type SettingsSection =
	| 'household'
	| 'alerts'
	| 'thresholds'
	| 'pdf'
	| 'backup'
	| 'display'
	| 'stores'
	| 'tags'

export function SettingsContainer() {
	const { t } = useTranslation()
	const { toast, confirm } = useDialog()
	const [loading, setLoading] = useState(true)
	const [activeSection, setActiveSection] = useState<SettingsSection>('household')

	const NAV_ITEMS: { id: SettingsSection; label: string; icon: string }[] = [
		{ id: 'household', label: t('settings.household'), icon: '🏠' },
		{ id: 'alerts', label: t('settings.alerts'), icon: '🔔' },
		{ id: 'thresholds', label: t('settings.thresholdsSection'), icon: '📦' },
		{ id: 'stores', label: t('settings.storesSection'), icon: '🛒' },
		{ id: 'tags', label: t('settings.tagsSection'), icon: '🏷️' },
		{ id: 'pdf', label: t('settings.pdfSettings'), icon: '📄' },
		{ id: 'backup', label: t('settings.importExport'), icon: '💾' },
		{ id: 'display', label: t('settings.displaySection'), icon: '🎛️' },
	]

	const [pageSize, setPageSizeState] = useState(getStoredPageSize)
	const [snoozeDuration, setSnoozeDurationState] = useState(getStoredSnoozeDuration)

	// Thresholds state
	const [ingredientThresholds, setIngredientThresholds] = useState<IngredientThreshold[]>([])
	const [recipeThresholds, setRecipeThresholds] = useState<RecipeThreshold[]>([])
	const [thresholdsLoading, setThresholdsLoading] = useState(false)
	const [thresholdsSearch, setThresholdsSearch] = useState('')
	const [editingIngredient, setEditingIngredient] = useState<{ id: number; value: string } | null>(
		null
	)
	const [editingRecipe, setEditingRecipe] = useState<{ id: number; value: string } | null>(null)

	// Household state
	const [household, setHousehold] = useState<Household | null>(null)
	const [householdName, setHouseholdName] = useState('')
	const [inviteEmail, setInviteEmail] = useState('')
	const [planningScope, setPlanningScope] = useState<'own' | 'all'>('own')
	const [joinCode, setJoinCode] = useState('')
	const [pendingInvites, setPendingInvites] = useState<
		{
			id: number
			email: string
			token: string
			household: { id: number; name: string }
			sender: { name: string }
		}[]
	>([])

	// Backup state
	const [importing, setImporting] = useState(false)
	const [importMode, setImportMode] = useState<'overwrite' | 'keep' | 'review'>('keep')

	// Stores state
	const currentUserId = authService.getUser()?.id ?? null
	const [stores, setStores] = useState<UserStore[]>([])
	const [storesLoading, setStoresLoading] = useState(false)
	const [showStoresSharing, setShowStoresSharing] = useState(false)
	const [newStoreName, setNewStoreName] = useState('')
	const [newStoreUrl, setNewStoreUrl] = useState('')
	const [newStoreLogoUrl, setNewStoreLogoUrl] = useState('')
	const [newStoreShared, setNewStoreShared] = useState(false)
	const [editingStoreId, setEditingStoreId] = useState<number | null>(null)
	const [editingStoreName, setEditingStoreName] = useState('')
	const [editingStoreUrl, setEditingStoreUrl] = useState('')
	const [editingStoreLogoUrl, setEditingStoreLogoUrl] = useState('')

	// Modal: dejar de compartir tienda
	const [unshareModal, setUnshareModal] = useState<{
		storeId: number
		storeName: string
		userNames: string[]
	} | null>(null)
	const [unshareLoading, setUnshareLoading] = useState(false)

	// Modal: admin intentando salir con otros miembros
	const [leaveAdminModal, setLeaveAdminModal] = useState(false)
	const [selectedNewAdmin, setSelectedNewAdmin] = useState<number | ''>('')
	const [leaveAdminLoading, setLeaveAdminLoading] = useState(false)

	// Modal: fusionar tienda con misma nombre del hogar
	const [mergeModal, setMergeModal] = useState<{
		sourceStoreId: number
		targetStoreId: number
		storeName: string
		otherUserName: string
	} | null>(null)
	const [mergeLoading, setMergeLoading] = useState(false)

	// Tags state
	const randomTagColor = () =>
		'#' +
		Math.floor(Math.random() * 0xffffff)
			.toString(16)
			.padStart(6, '0')
	const [tags, setTags] = useState<IngredientTag[]>([])
	const [tagsLoading, setTagsLoading] = useState(false)
	const [newTagName, setNewTagName] = useState('')
	const [newTagColor, setNewTagColor] = useState(randomTagColor)
	const [newTagError, setNewTagError] = useState<string | null>(null)
	const [editingTagId, setEditingTagId] = useState<number | null>(null)
	const [editingTagName, setEditingTagName] = useState('')
	const [editingTagColor, setEditingTagColor] = useState('#6c757d')
	const [editingTagError, setEditingTagError] = useState<string | null>(null)

	// PDF settings state (stored in localStorage)
	const [pdfShowAuthor, setPdfShowAuthor] = useState(
		() => localStorage.getItem('pdfShowAuthor') === 'true'
	)
	const [pdfShowVisibility, setPdfShowVisibility] = useState(
		() => localStorage.getItem('pdfShowVisibility') === 'true'
	)

	useEffect(() => {
		loadAll()
	}, [])

	useEffect(() => {
		if (activeSection === 'thresholds') {
			loadThresholds()
		}
		if (activeSection === 'stores' || activeSection === 'household') {
			loadStores()
		}
		if (activeSection === 'tags') {
			loadTags()
		}
	}, [activeSection])

	useEffect(() => {
		const isOpen = !!unshareModal || !!mergeModal
		document.body.style.overflow = isOpen ? 'hidden' : ''
		return () => {
			document.body.style.overflow = ''
		}
	}, [unshareModal, mergeModal])

	const loadThresholds = async () => {
		setThresholdsLoading(true)
		try {
			const [ing, rec] = await Promise.all([
				alertService.getIngredientThresholds(),
				alertService.getRecipeThresholds(),
			])
			setIngredientThresholds(ing)
			setRecipeThresholds(rec)
		} catch {
			console.error('Error loading thresholds')
		} finally {
			setThresholdsLoading(false)
		}
	}

	const loadStores = async () => {
		setStoresLoading(true)
		try {
			const data = await storeService.getAll()
			setStores(data)
			if (data.some((s) => s.isShared)) setShowStoresSharing(true)
		} catch {
			console.error('Error loading stores')
		} finally {
			setStoresLoading(false)
		}
	}

	const handleCreateStore = async () => {
		if (!newStoreName.trim()) return
		try {
			const created = await storeService.create({
				name: newStoreName.trim(),
				url: newStoreUrl.trim() || undefined,
				logoUrl: newStoreLogoUrl.trim() || undefined,
				isShared: newStoreShared,
			})
			setStores((prev) => [...prev, created])
			setNewStoreName('')
			setNewStoreUrl('')
			setNewStoreLogoUrl('')
			setNewStoreShared(false)
			toast.success(t('stores.created'))
		} catch {
			toast.error(t('stores.createError'))
		}
	}

	const handleUpdateStore = async (id: number) => {
		if (!editingStoreName.trim()) return
		try {
			const updated = await storeService.update(id, {
				name: editingStoreName.trim(),
				url: editingStoreUrl.trim() || undefined,
				logoUrl: editingStoreLogoUrl.trim() || undefined,
			})
			setStores((prev) => prev.map((s) => (s.id === id ? updated : s)))
			setEditingStoreId(null)
			toast.success(t('stores.updated'))
		} catch {
			toast.error(t('stores.updateError'))
		}
	}

	const handleToggleStoreShared = async (id: number, isShared: boolean) => {
		if (!isShared) {
			// Comprobar si otros usuarios tienen ingredientes en esta tienda
			try {
				const { count, userNames } = await storeService.checkOtherUsers(id)
				if (count > 0) {
					// Mostrar modal de confirmación
					const store = stores.find((s) => s.id === id)
					setUnshareModal({ storeId: id, storeName: store?.name ?? '', userNames })
					return
				}
			} catch {
				toast.error(t('stores.updateError'))
				return
			}
		} else {
			// Al compartir: comprobar si hay otra tienda con el mismo nombre en el hogar
			const thisStore = stores.find((s) => s.id === id)
			if (thisStore && household) {
				const sameName = stores.find(
					(s) =>
						s.id !== id &&
						s.userId !== currentUserId &&
						s.isShared &&
						s.name.toLowerCase() === thisStore.name.toLowerCase()
				)
				if (sameName) {
					setMergeModal({
						sourceStoreId: id,
						targetStoreId: sameName.id,
						storeName: thisStore.name,
						otherUserName: sameName.user?.name || sameName.user?.email || '?',
					})
					return
				}
			}
		}
		try {
			const updated = await storeService.update(id, { isShared })
			setStores((prev) => prev.map((s) => (s.id === id ? updated : s)))
		} catch {
			toast.error(t('stores.updateError'))
		}
	}

	const handleUnshare = async (mode: 'delete' | 'duplicate') => {
		if (!unshareModal) return
		setUnshareLoading(true)
		try {
			await storeService.unshare(unshareModal.storeId, mode)
			toast.success(t('stores.unshareSuccess'))
			setUnshareModal(null)
			await loadStores()
		} catch {
			toast.error(t('stores.unshareError'))
		} finally {
			setUnshareLoading(false)
		}
	}

	const handleMerge = async () => {
		if (!mergeModal) return
		setMergeLoading(true)
		try {
			await storeService.mergeStores(mergeModal.sourceStoreId, mergeModal.targetStoreId)
			toast.success(t('stores.mergeSuccess'))
			setMergeModal(null)
			await loadStores()
		} catch {
			toast.error(t('stores.mergeError'))
		} finally {
			setMergeLoading(false)
		}
	}

	const handleMergeDecline = async () => {
		if (!mergeModal) return
		// Compartir sin fusionar
		try {
			const updated = await storeService.update(mergeModal.sourceStoreId, { isShared: true })
			setStores((prev) => prev.map((s) => (s.id === mergeModal.sourceStoreId ? updated : s)))
		} catch {
			toast.error(t('stores.updateError'))
		}
		setMergeModal(null)
	}

	const handleDeleteStore = async (id: number) => {
		const ok = await confirm({
			title: t('stores.deleteConfirm', { name: stores.find((s) => s.id === id)?.name }),
			message: '',
			confirmText: t('delete'),
			type: 'danger',
		})
		if (!ok) return
		try {
			await storeService.delete(id)
			setStores((prev) => prev.filter((s) => s.id !== id))
			toast.success(t('stores.deleted'))
		} catch {
			toast.error(t('stores.deleteError'))
		}
	}

	const loadTags = async () => {
		setTagsLoading(true)
		try {
			const data = await ingredientTagService.getAll(true) // incluir ocultas para poder gestionarlas
			setTags(data)
		} catch {
			console.error('Error loading tags')
		} finally {
			setTagsLoading(false)
		}
	}

	const handleCreateTag = async () => {
		if (!newTagName.trim()) return
		setNewTagError(null)
		try {
			const created = await ingredientTagService.create({
				name: newTagName.trim(),
				color: newTagColor,
			})
			setTags((prev) => [...prev, created])
			setNewTagName('')
			setNewTagColor(randomTagColor())
			toast.success(t('tags.created'))
		} catch (err: unknown) {
			const e = err as { httpCode?: number; status?: number }
			if (e?.httpCode === 409 || e?.status === 409) {
				setNewTagError(t('tags.duplicateName'))
			} else {
				toast.error(t('tags.createError'))
			}
		}
	}

	const handleUpdateTag = async (id: number) => {
		if (!editingTagName.trim()) return
		setEditingTagError(null)
		try {
			const updated = await ingredientTagService.update(id, {
				name: editingTagName.trim(),
				color: editingTagColor,
			})
			setTags((prev) => prev.map((tg) => (tg.id === id ? updated : tg)))
			setEditingTagId(null)
			toast.success(t('tags.updated'))
		} catch (err: unknown) {
			const e = err as { httpCode?: number; status?: number }
			if (e?.httpCode === 409 || e?.status === 409) {
				setEditingTagError(t('tags.duplicateName'))
			} else {
				toast.error(t('tags.updateError'))
			}
		}
	}

	const handleDeleteTag = async (id: number) => {
		const ok = await confirm({
			title: t('tags.deleteConfirm', { name: tags.find((tg) => tg.id === id)?.name }),
			message: '',
			confirmText: t('delete'),
			type: 'danger',
		})
		if (!ok) return
		try {
			await ingredientTagService.delete(id)
			setTags((prev) => prev.filter((tg) => tg.id !== id))
			toast.success(t('tags.deleted'))
		} catch {
			toast.error(t('tags.deleteError'))
		}
	}

	const handleToggleHideGlobal = async (tag: IngredientTag) => {
		try {
			await ingredientTagService.saveUserPreference(tag.id, {
				isHiddenGlobally: !tag.isHiddenGlobally,
			})
			toast.success(tag.isHiddenGlobally ? t('tags.unhidden') : t('tags.hidden'))
			setTags((prev) =>
				prev.map((tg) =>
					tg.id === tag.id ? { ...tg, isHiddenGlobally: !tag.isHiddenGlobally } : tg
				)
			)
		} catch {
			toast.error(t('error'))
		}
	}

	const handleColorOverride = async (tag: IngredientTag, color: string) => {
		try {
			await ingredientTagService.saveUserPreference(tag.id, { colorOverride: color })
			setTags((prev) => prev.map((tg) => (tg.id === tag.id ? { ...tg, colorOverride: color } : tg)))
		} catch {
			toast.error(t('error'))
		}
	}

	const handleDeleteIngredientThreshold = async (ingredientId: number) => {
		try {
			await alertService.deleteIngredientThreshold(ingredientId)
			setIngredientThresholds((prev) => prev.filter((t) => t.ingredientId !== ingredientId))
			toast.success(t('settings.thresholdRemoved'))
		} catch {
			toast.error(t('settings.errorSaving'))
		}
	}

	const handleDeleteRecipeThreshold = async (recipeId: number) => {
		try {
			await alertService.deleteRecipeThreshold(recipeId)
			setRecipeThresholds((prev) => prev.filter((t) => t.recipeId !== recipeId))
			toast.success(t('settings.thresholdRemoved'))
		} catch {
			toast.error(t('settings.errorSaving'))
		}
	}

	const handleSaveIngredientThreshold = async (th: IngredientThreshold, value: string) => {
		const num = parseFloat(value)
		if (!value || isNaN(num) || num <= 0) return
		try {
			await alertService.setIngredientThreshold({
				ingredientId: th.ingredientId,
				minQuantity: num,
				unit: th.unit,
			})
			setIngredientThresholds((prev) =>
				prev.map((item) =>
					item.ingredientId === th.ingredientId ? { ...item, minQuantity: num } : item
				)
			)
			setEditingIngredient(null)
			toast.success(t('settings.configSaved'))
		} catch {
			toast.error(t('settings.errorSaving'))
		}
	}

	const handleSaveRecipeThreshold = async (th: RecipeThreshold, value: string) => {
		const num = parseInt(value, 10)
		if (!value || isNaN(num) || num <= 0) return
		try {
			await alertService.setRecipeThreshold({ recipeId: th.recipeId, minServings: num })
			setRecipeThresholds((prev) =>
				prev.map((item) => (item.recipeId === th.recipeId ? { ...item, minServings: num } : item))
			)
			setEditingRecipe(null)
			toast.success(t('settings.configSaved'))
		} catch {
			toast.error(t('settings.errorSaving'))
		}
	}

	const loadAll = async () => {
		try {
			const hh = await householdService.get()
			setHousehold(hh)
		} catch (error) {
			console.error('Error loading household:', error)
		}

		try {
			const invites = await householdService.getPendingInvites()
			setPendingInvites(invites)
		} catch {
			console.error('Error loading pending invites')
		}

		try {
			const { profileService } = await import('@/services/profile')
			const profileData = await profileService.getProfile()
			setPlanningScope((profileData as any).planningAlertScope || 'own')
		} catch {
			console.error('Error loading planning scope')
		}

		setLoading(false)
	}

	const handleCreateHousehold = async () => {
		if (!householdName.trim()) return
		try {
			const hh = await householdService.create({ name: householdName.trim() })
			setHousehold(hh as any)
			setHouseholdName('')
			toast.success(t('settings.householdCreated'))
		} catch (e: any) {
			toast.error(e.message || t('settings.errorCreatingHousehold'))
		}
	}

	const handleInvite = async () => {
		if (!inviteEmail.trim() || !household) return
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		if (!emailRegex.test(inviteEmail.trim())) {
			toast.error(t('settings.invalidEmail'))
			return
		}
		const emailLower = inviteEmail.trim().toLowerCase()
		// Comprobar si ya es miembro
		const isMember = household.members.some((m) => m.user?.email?.toLowerCase() === emailLower)
		if (isMember) {
			toast.error(t('settings.alreadyMemberError'))
			return
		}
		// Comprobar si ya hay invitación pendiente
		const hasInvite = household.invites?.some((inv) => inv.email.toLowerCase() === emailLower)
		if (hasInvite) {
			toast.error(t('settings.alreadyInvitedError'))
			return
		}
		try {
			await householdService.invite(household.id, inviteEmail.trim())
			setInviteEmail('')
			toast.success(t('settings.inviteSent'))
			const hh = await householdService.get()
			setHousehold(hh)
		} catch (e: any) {
			toast.error(e.message || t('settings.errorInviting'))
		}
	}

	const handleCancelInvite = async (inviteId: number) => {
		if (!household) return
		const ok = await confirm({
			title: t('settings.cancelInviteTitle'),
			message: t('settings.cancelInviteMsg'),
			type: 'danger',
			confirmText: t('settings.cancelInviteBtn'),
		})
		if (!ok) return
		try {
			await householdService.cancelInvite(household.id, inviteId)
			const hh = await householdService.get()
			setHousehold(hh)
			toast.success(t('settings.inviteCancelled'))
		} catch (e: any) {
			toast.error(e.message || 'Error')
		}
	}

	const handleJoinByCode = async () => {
		if (!joinCode.trim()) return
		const ok = await confirm({
			title: t('settings.joinHouseholdTitle'),
			message: t('settings.joinHouseholdMsg'),
			confirmText: t('settings.joinBtn'),
			type: 'warning',
		})
		if (!ok) return
		try {
			const hh = await householdService.joinByCode(joinCode.trim())
			setHousehold(hh as any)
			setJoinCode('')
			toast.success(t('settings.joinedSuccess'))
		} catch (e: any) {
			toast.error(e.message || t('settings.joinError'))
		}
	}

	const handleAcceptPendingInvite = async (token: string) => {
		const ok = await confirm({
			title: t('settings.joinHouseholdTitle'),
			message: t('settings.joinHouseholdMsg'),
			confirmText: t('settings.joinBtn'),
			type: 'warning',
		})
		if (!ok) return
		try {
			const hh = await householdService.acceptInvite(token)
			setHousehold(hh as any)
			setPendingInvites([])
			toast.success(t('settings.joinedSuccess'))
		} catch (e: any) {
			toast.error(e.message || t('settings.joinError'))
		}
	}

	const handleRemoveMember = async (userId: number) => {
		if (!household) return
		const ok = await confirm({
			title: t('settings.removeMember'),
			message: t('settings.confirmRemove'),
			type: 'danger',
			confirmText: t('settings.remove'),
		})
		if (!ok) return
		try {
			await householdService.removeMember(household.id, userId)
			const hh = await householdService.get()
			setHousehold(hh)
			toast.success(t('settings.memberRemoved'))
		} catch (e: any) {
			toast.error(e.message || 'Error')
		}
	}

	const handleLeave = async () => {
		if (!household) return
		// Si es admin con otros miembros → abrir modal especial
		if (
			household.myRole === 'ADMIN' &&
			household.members.filter((m) => m.userId !== currentUserId).length > 0
		) {
			setSelectedNewAdmin('')
			setLeaveAdminModal(true)
			return
		}
		const ok = await confirm({
			title: t('settings.leaveHousehold'),
			message: t('settings.confirmLeave'),
			type: 'warning',
			confirmText: t('settings.leave'),
		})
		if (!ok) return
		try {
			await householdService.leave(household.id)
			setHousehold(null)
			toast.success(t('settings.leftHousehold'))
		} catch (e: any) {
			toast.error(e.message || 'Error')
		}
	}

	const handleTransferAdmin = async () => {
		if (!household || !selectedNewAdmin) return
		setLeaveAdminLoading(true)
		try {
			await householdService.transferAdmin(household.id, Number(selectedNewAdmin))
			setLeaveAdminModal(false)
			setHousehold(null)
			toast.success(t('settings.adminTransferred'))
		} catch (e: any) {
			toast.error(e.message || 'Error')
		} finally {
			setLeaveAdminLoading(false)
		}
	}

	const handleDissolve = async () => {
		if (!household) return
		const ok = await confirm({
			title: t('settings.dissolveHousehold'),
			message: t('settings.confirmDissolve'),
			type: 'danger',
			confirmText: t('settings.dissolveConfirm'),
		})
		if (!ok) return
		setLeaveAdminLoading(true)
		try {
			await householdService.dissolve(household.id)
			setLeaveAdminModal(false)
			setHousehold(null)
			toast.success(t('settings.dissolved'))
		} catch (e: any) {
			toast.error(e.message || 'Error')
		} finally {
			setLeaveAdminLoading(false)
		}
	}

	const handleUpdateHousehold = async (
		data: Partial<{ shareHome: boolean; shareShopping: boolean; shareAlerts: boolean }>
	) => {
		if (!household) return
		try {
			const updated = await householdService.update(household.id, data)
			setHousehold({ ...household, ...updated })
		} catch (e: any) {
			toast.error(e.message || 'Error')
		}
	}

	const handlePlanningScope = async (scope: 'own' | 'all') => {
		try {
			await householdService.updatePlanningScope(scope)
			setPlanningScope(scope)
			toast.success(t('settings.configSaved'))
		} catch {
			toast.error(t('settings.errorSaving'))
		}
	}

	const handleExport = async () => {
		try {
			await backupService.downloadBackupCsv()
			toast.success(t('settings.backupDownloaded'))
		} catch {
			toast.error(t('settings.errorExporting'))
		}
	}

	const handleExportJson = async () => {
		try {
			await backupService.downloadBackupJson()
			toast.success(t('settings.backupDownloaded'))
		} catch {
			toast.error(t('settings.errorExporting'))
		}
	}

	const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return
		setImporting(true)
		try {
			const result = await backupService.importBackupFile(file, importMode)
			const summary = Object.entries(result.results)
				.map(([key, val]) => `${key}: +${val.created}`)
				.join(', ')
			toast.success(`${t('settings.importComplete')}: ${summary}`)
			loadAll()
		} catch (err: any) {
			toast.error(err.message || t('settings.errorImporting'))
		} finally {
			setImporting(false)
			e.target.value = ''
		}
	}

	if (loading) {
		return <div className='loading'>{t('loading')}</div>
	}

	return (
		<div className='settings-container'>
			<div className='page-header'>
				<h1 className='page-title'>{t('settings.title')}</h1>
			</div>

			<div className='settings-layout'>
				<nav className='settings-nav'>
					{NAV_ITEMS.map((item) => (
						<button
							key={item.id}
							className={`settings-nav-item ${activeSection === item.id ? 'active' : ''}`}
							onClick={() => setActiveSection(item.id)}>
							<span className='settings-nav-icon'>{item.icon}</span>
							<span className='settings-nav-label'>{item.label}</span>
						</button>
					))}
				</nav>

				<div className='settings-content'>
					{activeSection === 'household' && (
						<div className='settings-card'>
							<h2 className='settings-card-title'>{t('settings.household')}</h2>
							<p className='settings-card-description'>{t('settings.householdDesc')}</p>

							{!household ? (
								<div className='household-create'>
									{pendingInvites.length > 0 && (
										<div className='household-pending-invites'>
											<h4>{t('settings.pendingInvitesForYou')}</h4>
											{pendingInvites.map((inv) => (
												<div key={inv.id} className='household-pending-invite'>
													<span>
														{inv.sender.name} {t('settings.invitedYouTo')}{' '}
														<strong>{inv.household.name}</strong>
													</span>
													<button
														className='btn btn-primary btn-sm'
														onClick={() => handleAcceptPendingInvite(inv.token)}>
														{t('settings.joinBtn')}
													</button>
												</div>
											))}
										</div>
									)}

									<h4>{t('settings.createHousehold')}</h4>
									<div className='form-row'>
										<div className='form-group' style={{ flex: 1 }}>
											<input
												type='text'
												className='form-input'
												value={householdName}
												onChange={(e) => setHouseholdName(e.target.value)}
												placeholder={t('settings.householdName')}
											/>
										</div>
										<button className='btn btn-primary' onClick={handleCreateHousehold}>
											{t('settings.createHousehold')}
										</button>
									</div>

									<div style={{ marginTop: '1.5rem' }}>
										<h4>{t('settings.joinHouseholdTitle')}</h4>
										<p className='settings-card-description'>
											{t('settings.joinHouseholdCodeDesc')}
										</p>
										<div className='form-row'>
											<div className='form-group' style={{ flex: 1 }}>
												<input
													type='text'
													className='form-input'
													value={joinCode}
													onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
													placeholder={t('settings.joinCodePlaceholder')}
													maxLength={8}
													style={{ letterSpacing: '0.15em', fontFamily: 'monospace' }}
												/>
											</div>
											<button
												className='btn btn-primary'
												onClick={handleJoinByCode}
												disabled={joinCode.trim().length < 4}>
												{t('settings.joinBtn')}
											</button>
										</div>
									</div>
								</div>
							) : (
								<div className='household-info'>
									<div className='household-header'>
										<h3>{household.name}</h3>
										<span className='household-role'>{household.myRole}</span>
									</div>

									{household.joinCode && (
										<div className='household-join-code'>
											<span className='join-code-label'>{t('settings.joinCode')}: </span>
											<code className='join-code-value'>{household.joinCode}</code>
											<button
												className='btn btn-outline btn-sm'
												style={{ marginLeft: '0.5rem' }}
												onClick={async () => {
													try {
														await navigator.clipboard.writeText(household.joinCode!)
														toast.success(t('settings.codeCopied'))
													} catch {
														// Fallback para contextos sin permisos de clipboard
														const el = document.createElement('textarea')
														el.value = household.joinCode!
														el.style.position = 'fixed'
														el.style.opacity = '0'
														document.body.appendChild(el)
														el.select()
														document.execCommand('copy')
														document.body.removeChild(el)
														toast.success(t('settings.codeCopied'))
													}
												}}>
												{t('settings.copyCode')}
											</button>
										</div>
									)}

									<div className='household-toggles'>
										<label className='toggle-label'>
											<input
												type='checkbox'
												checked={household.shareHome}
												onChange={(e) => handleUpdateHousehold({ shareHome: e.target.checked })}
											/>
											<span>{t('settings.shareInventory')}</span>
										</label>
										<label className='toggle-label'>
											<input
												type='checkbox'
												checked={household.shareShopping}
												onChange={(e) => handleUpdateHousehold({ shareShopping: e.target.checked })}
											/>
											<span>{t('settings.shareShopping')}</span>
										</label>
										<label className='toggle-label'>
											<input
												type='checkbox'
												checked={household.shareAlerts}
												onChange={(e) => handleUpdateHousehold({ shareAlerts: e.target.checked })}
											/>
											<span>{t('settings.shareAlerts')}</span>
										</label>
										{!storesLoading && stores.length > 0 && (
											<label className='toggle-label'>
												<input
													type='checkbox'
													checked={showStoresSharing}
													onChange={(e) => setShowStoresSharing(e.target.checked)}
												/>
												<span>{t('settings.sharedStores')}</span>
											</label>
										)}
									</div>
									{!storesLoading && showStoresSharing && stores.length > 0 && (
										<div
											style={{
												marginLeft: '1.75rem',
												marginTop: '0.5rem',
												display: 'flex',
												flexDirection: 'column',
												gap: '0.35rem',
											}}>
											{stores.map((store) => (
												<label key={store.id} className='toggle-label'>
													<input
														type='checkbox'
														checked={store.isShared}
														onChange={(e) => handleToggleStoreShared(store.id, e.target.checked)}
													/>
													<span>
														{store.name}
														{store.user && (
															<span
																style={{
																	color: 'var(--text-muted)',
																	fontSize: '0.8em',
																	marginLeft: '0.4em',
																}}>
																({store.user.name || store.user.email})
															</span>
														)}
													</span>
												</label>
											))}
										</div>
									)}

									<div className='household-members'>
										<h4>{t('settings.members')}</h4>
										{household.members.map((m) => (
											<div key={m.id} className='household-member'>
												<span>
													{m.user?.name || m.user?.email} ({m.role})
												</span>
												{household.myRole === 'ADMIN' &&
													m.userId !==
														household.members.find((mm) => mm.role === 'ADMIN')?.userId && (
														<button
															className='btn-icon btn-icon--danger'
															title={t('settings.remove')}
															onClick={() => handleRemoveMember(m.userId)}>
															<svg
																xmlns='http://www.w3.org/2000/svg'
																width='16'
																height='16'
																viewBox='0 0 24 24'
																fill='none'
																stroke='currentColor'
																strokeWidth='2'
																strokeLinecap='round'
																strokeLinejoin='round'>
																<polyline points='3 6 5 6 21 6' />
																<path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' />
																<path d='M10 11v6' />
																<path d='M14 11v6' />
																<path d='M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2' />
															</svg>
														</button>
													)}
											</div>
										))}
									</div>

									{household.invites && household.invites.length > 0 && (
										<div className='household-invites'>
											<h4>{t('settings.pendingInvites')}</h4>
											{household.invites.map((inv) => (
												<div key={inv.id} className='household-invite'>
													<span>
														{inv.email} &mdash; {t('settings.expires')}{' '}
														{new Date(inv.expiresAt).toLocaleDateString()}
													</span>
													{household.myRole === 'ADMIN' && (
														<button
															className='btn-icon btn-icon--muted'
															title={t('settings.cancelInviteBtn')}
															onClick={() => handleCancelInvite(inv.id)}>
															{'\u2715'}
														</button>
													)}
												</div>
											))}
										</div>
									)}

									<div className='form-row' style={{ marginTop: '1rem' }}>
										<div className='form-group' style={{ flex: 1 }}>
											<input
												type='email'
												className='form-input'
												value={inviteEmail}
												onChange={(e) => setInviteEmail(e.target.value)}
												placeholder={t('settings.inviteEmailPlaceholder')}
											/>
										</div>
										<button className='btn btn-primary' onClick={handleInvite}>
											{t('settings.invite')}
										</button>
									</div>

									<div style={{ marginTop: '1rem' }}>
										<button className='btn btn-outline btn-sm' onClick={handleLeave}>
											{t('settings.leaveHousehold')}
										</button>
									</div>
								</div>
							)}
						</div>
					)}

					{activeSection === 'alerts' && (
						<div className='settings-card'>
							<h2 className='settings-card-title'>{t('settings.stockAlertsPlanning')}</h2>
							<p className='settings-card-description'>{t('settings.stockAlertsDesc')}</p>
							<div className='form-group'>
								<select
									className='form-input'
									value={planningScope}
									onChange={(e) => handlePlanningScope(e.target.value as 'own' | 'all')}>
									<option value='own'>{t('settings.onlyMyPlanning')}</option>
									<option value='all'>{t('settings.allMembersPlanning')}</option>
								</select>
							</div>
							<p className='settings-card-description' style={{ marginTop: '1rem' }}>
								{t('settings.thresholdsConfigHint')}
							</p>
						</div>
					)}

					{activeSection === 'pdf' && (
						<div className='settings-card'>
							<h2 className='settings-card-title'>{t('settings.pdfSettings')}</h2>
							<p className='settings-card-description'>{t('settings.pdfSettingsDesc')}</p>

							<div className='household-toggles'>
								<label className='toggle-label'>
									<input
										type='checkbox'
										checked={pdfShowAuthor}
										onChange={(e) => {
											setPdfShowAuthor(e.target.checked)
											localStorage.setItem('pdfShowAuthor', String(e.target.checked))
										}}
									/>
									<span>{t('settings.pdfShowAuthor')}</span>
								</label>
								<label className='toggle-label'>
									<input
										type='checkbox'
										checked={pdfShowVisibility}
										onChange={(e) => {
											setPdfShowVisibility(e.target.checked)
											localStorage.setItem('pdfShowVisibility', String(e.target.checked))
										}}
									/>
									<span>{t('settings.pdfShowVisibility')}</span>
								</label>
							</div>
						</div>
					)}

					{activeSection === 'backup' && (
						<div className='settings-card'>
							<h2 className='settings-card-title'>{t('settings.importExport')}</h2>
							<p className='settings-card-description'>{t('settings.backupDesc')}</p>

							<div className='backup-actions'>
								<button className='btn btn-primary' onClick={handleExport}>
									{t('settings.exportBackupCsvZip')}
								</button>
								<button className='btn btn-outline' onClick={handleExportJson}>
									{t('settings.exportBackupJson')}
								</button>

								<div className='backup-import'>
									<div className='form-group'>
										<label className='form-label'>{t('settings.importMode')}</label>
										<select
											className='form-input'
											value={importMode}
											onChange={(e) => setImportMode(e.target.value as any)}>
											<option value='keep'>{t('settings.importKeep')}</option>
											<option value='overwrite'>{t('settings.importOverwrite')}</option>
											<option value='review'>{t('settings.importReview')}</option>
										</select>
									</div>
									<label className='btn btn-outline' style={{ cursor: 'pointer' }}>
										{importing ? t('settings.importing') : t('settings.importBackup')}
										<input
											type='file'
											accept='.json,.csv,.zip'
											onChange={handleImport}
											style={{ display: 'none' }}
											disabled={importing}
										/>
									</label>
								</div>
							</div>
						</div>
					)}

					{activeSection === 'thresholds' && (
						<div className='settings-card'>
							<h2 className='settings-card-title'>{t('settings.thresholdsSection')}</h2>
							<p className='settings-card-description'>{t('settings.thresholdsSectionDesc')}</p>

							{thresholdsLoading ? (
								<p className='settings-card-description'>{t('settings.loading')}</p>
							) : (
								<>
									<input
										type='search'
										className='form-input'
										placeholder={t('settings.thresholdsSearch')}
										value={thresholdsSearch}
										onChange={(e) => setThresholdsSearch(e.target.value)}
										style={{ marginTop: '1rem', maxWidth: '20rem' }}
									/>

									<h3 className='settings-subsection-title' style={{ marginTop: '1.5rem' }}>
										{t('settings.thresholdsIngredients')}
									</h3>
									{ingredientThresholds.filter((th) =>
										(th.ingredient?.name ?? '')
											.toLowerCase()
											.includes(thresholdsSearch.toLowerCase())
									).length === 0 ? (
										<p className='settings-card-description'>{t('settings.thresholdsEmpty')}</p>
									) : (
										<ul className='thresholds-list'>
											{ingredientThresholds
												.filter((th) =>
													(th.ingredient?.name ?? '')
														.toLowerCase()
														.includes(thresholdsSearch.toLowerCase())
												)
												.map((th) => (
													<li key={th.id} className='thresholds-list__item'>
														<span className='thresholds-list__name'>
															{th.ingredient?.name ?? `#${th.ingredientId}`}
														</span>
														{editingIngredient?.id === th.ingredientId ? (
															<div className='thresholds-list__edit'>
																<input
																	type='number'
																	className='form-input form-input-sm'
																	value={editingIngredient.value}
																	onChange={(e) =>
																		setEditingIngredient({
																			id: th.ingredientId,
																			value: e.target.value,
																		})
																	}
																	min={0}
																	step={0.1}
																	autoFocus
																/>
																<span className='thresholds-list__unit'>{th.unit}</span>
																<button
																	type='button'
																	className='btn-icon'
																	onClick={() =>
																		handleSaveIngredientThreshold(th, editingIngredient.value)
																	}>
																	<HiOutlineCheck />
																</button>
																<button
																	type='button'
																	className='btn-icon'
																	onClick={() => setEditingIngredient(null)}>
																	<HiOutlineXMark />
																</button>
															</div>
														) : (
															<span className='thresholds-list__meta'>
																{t('settings.thresholdsMin')} {th.minQuantity} {th.unit}
															</span>
														)}
														<div className='thresholds-list__actions'>
															{editingIngredient?.id !== th.ingredientId && (
																<button
																	type='button'
																	className='btn-icon'
																	onClick={() =>
																		setEditingIngredient({
																			id: th.ingredientId,
																			value: String(th.minQuantity),
																		})
																	}>
																	<HiOutlinePencil />
																</button>
															)}
															<button
																type='button'
																className='btn-icon btn-icon--danger'
																onClick={() => handleDeleteIngredientThreshold(th.ingredientId)}>
																<HiOutlineTrash />
															</button>
														</div>
													</li>
												))}
										</ul>
									)}

									<h3 className='settings-subsection-title' style={{ marginTop: '1.5rem' }}>
										{t('settings.thresholdsRecipes')}
									</h3>
									{recipeThresholds.filter((th) =>
										(th.recipe?.title ?? '').toLowerCase().includes(thresholdsSearch.toLowerCase())
									).length === 0 ? (
										<p className='settings-card-description'>{t('settings.thresholdsEmpty')}</p>
									) : (
										<ul className='thresholds-list'>
											{recipeThresholds
												.filter((th) =>
													(th.recipe?.title ?? '')
														.toLowerCase()
														.includes(thresholdsSearch.toLowerCase())
												)
												.map((th) => (
													<li key={th.id} className='thresholds-list__item'>
														<span className='thresholds-list__name'>
															{th.recipe?.title ?? `#${th.recipeId}`}
														</span>
														{editingRecipe?.id === th.recipeId ? (
															<div className='thresholds-list__edit'>
																<input
																	type='number'
																	className='form-input form-input-sm'
																	value={editingRecipe.value}
																	onChange={(e) =>
																		setEditingRecipe({ id: th.recipeId, value: e.target.value })
																	}
																	min={1}
																	step={1}
																	autoFocus
																/>
																<span className='thresholds-list__unit'>
																	{t('recipes.portionsUnit')}
																</span>
																<button
																	type='button'
																	className='btn-icon'
																	onClick={() =>
																		handleSaveRecipeThreshold(th, editingRecipe.value)
																	}>
																	<HiOutlineCheck />
																</button>
																<button
																	type='button'
																	className='btn-icon'
																	onClick={() => setEditingRecipe(null)}>
																	<HiOutlineXMark />
																</button>
															</div>
														) : (
															<span className='thresholds-list__meta'>
																{t('settings.thresholdsMin')} {th.minServings}{' '}
																{t('recipes.portionsUnit')}
															</span>
														)}
														<div className='thresholds-list__actions'>
															{editingRecipe?.id !== th.recipeId && (
																<button
																	type='button'
																	className='btn-icon'
																	onClick={() =>
																		setEditingRecipe({
																			id: th.recipeId,
																			value: String(th.minServings),
																		})
																	}>
																	<HiOutlinePencil />
																</button>
															)}
															<button
																type='button'
																className='btn-icon btn-icon--danger'
																onClick={() => handleDeleteRecipeThreshold(th.recipeId)}>
																<HiOutlineTrash />
															</button>
														</div>
													</li>
												))}
										</ul>
									)}
								</>
							)}
						</div>
					)}

					{activeSection === 'stores' && (
						<div className='settings-card'>
							<h2 className='settings-card-title'>{t('settings.storesSection')}</h2>
							<p className='settings-card-description'>{t('settings.storesSectionDesc')}</p>

							{storesLoading ? (
								<p className='settings-card-description'>{t('settings.loading')}</p>
							) : (
								<>
									{/* Tiendas propias */}
									{stores.filter((s) => s.userId === currentUserId).length === 0 ? (
										<p className='settings-card-description'>{t('stores.noStores')}</p>
									) : (
										<ul className='thresholds-list'>
											{stores
												.filter((s) => s.userId === currentUserId)
												.map((store) => (
													<li key={store.id} className='thresholds-list__item'>
														{editingStoreId === store.id ? (
															<>
																<div
																	style={{
																		display: 'flex',
																		flexDirection: 'column',
																		gap: '0.4rem',
																		flex: 1,
																	}}>
																	<input
																		className='form-input form-input-sm'
																		value={editingStoreName}
																		onChange={(e) => setEditingStoreName(e.target.value)}
																		autoFocus
																		placeholder={t('stores.name')}
																		onKeyDown={(e) => {
																			if (e.key === 'Enter') handleUpdateStore(store.id)
																			if (e.key === 'Escape') setEditingStoreId(null)
																		}}
																	/>
																	<input
																		className='form-input form-input-sm'
																		type='url'
																		value={editingStoreUrl}
																		onChange={(e) => setEditingStoreUrl(e.target.value)}
																		placeholder={t('stores.url')}
																	/>
																	<input
																		className='form-input form-input-sm'
																		type='url'
																		value={editingStoreLogoUrl}
																		onChange={(e) => setEditingStoreLogoUrl(e.target.value)}
																		placeholder={t('stores.logoUrl')}
																	/>
																</div>
																<div className='thresholds-list__actions'>
																	<button
																		type='button'
																		className='btn-icon'
																		onClick={() => handleUpdateStore(store.id)}>
																		<HiOutlineCheck />
																	</button>
																	<button
																		type='button'
																		className='btn-icon'
																		onClick={() => setEditingStoreId(null)}>
																		<HiOutlineXMark />
																	</button>
																</div>
															</>
														) : (
															<>
																<span className='thresholds-list__name'>
																	{store.logoUrl && (
																		<img
																			src={store.logoUrl}
																			alt=''
																			style={{
																				width: '1.2rem',
																				height: '1.2rem',
																				objectFit: 'contain',
																				marginRight: '0.4rem',
																				verticalAlign: 'middle',
																			}}
																		/>
																	)}
																	{store.name}
																	{household && store.isShared && (
																		<span className='settings-badge'> {t('stores.shared')}</span>
																	)}
																</span>
																{store.url && (
																	<a
																		href={store.url}
																		target='_blank'
																		rel='noopener noreferrer'
																		className='thresholds-list__meta'>
																		{store.url}
																	</a>
																)}
																<div className='thresholds-list__actions'>
																	{household &&
																		(() => {
																			const dup = stores.find(
																				(s) =>
																					s.userId !== currentUserId &&
																					s.name.toLowerCase() === store.name.toLowerCase()
																			)
																			if (!dup) return null
																			return (
																				<button
																					type='button'
																					className='btn-icon'
																					title={t('stores.unify')}
																					onClick={() =>
																						setMergeModal({
																							sourceStoreId: store.id,
																							targetStoreId: dup.id,
																							storeName: store.name,
																							otherUserName:
																								dup.user?.name || dup.user?.email || '?',
																						})
																					}>
																					<HiOutlineLink />
																				</button>
																			)
																		})()}
																	<button
																		type='button'
																		className='btn-icon'
																		onClick={() => {
																			setEditingStoreId(store.id)
																			setEditingStoreName(store.name)
																			setEditingStoreUrl(store.url ?? '')
																			setEditingStoreLogoUrl(store.logoUrl ?? '')
																		}}>
																		<HiOutlinePencil />
																	</button>
																	<button
																		type='button'
																		className='btn-icon btn-icon--danger'
																		onClick={() => handleDeleteStore(store.id)}>
																		<HiOutlineTrash />
																	</button>
																</div>
															</>
														)}
													</li>
												))}
										</ul>
									)}

									{/* Tiendas compartidas del hogar (de otros miembros) */}
									{household &&
										stores.filter((s) => s.userId !== currentUserId && s.isShared).length > 0 && (
											<>
												<h4 className='settings-subsection-title' style={{ marginTop: '1.5rem' }}>
													{t('settings.householdSharedStores')}
												</h4>
												<ul className='thresholds-list'>
													{stores
														.filter((s) => s.userId !== currentUserId && s.isShared)
														.map((store) => {
															const ownMatch = stores.find(
																(s) =>
																	s.userId === currentUserId &&
																	s.name.toLowerCase() === store.name.toLowerCase()
															)
															return (
																<li key={store.id} className='thresholds-list__item'>
																	<span className='thresholds-list__name'>
																		{store.name}
																		{store.user && (
																			<span
																				className='thresholds-list__meta'
																				style={{ marginLeft: '0.5rem' }}>
																				{store.user.name || store.user.email}
																			</span>
																		)}
																	</span>
																	{store.url && (
																		<a
																			href={store.url}
																			target='_blank'
																			rel='noopener noreferrer'
																			className='thresholds-list__meta'>
																			{store.url}
																		</a>
																	)}
																	{ownMatch && (
																		<div className='thresholds-list__actions'>
																			<button
																				type='button'
																				className='btn-icon'
																				title={t('stores.unify')}
																				onClick={() =>
																					setMergeModal({
																						sourceStoreId: ownMatch.id,
																						targetStoreId: store.id,
																						storeName: store.name,
																						otherUserName:
																							store.user?.name || store.user?.email || '?',
																					})
																				}>
																				<HiOutlineLink />
																			</button>
																		</div>
																	)}
																</li>
															)
														})}
												</ul>
											</>
										)}

									<div className='settings-add-form'>
										<h4 className='settings-subsection-title'>{t('settings.storesAdd')}</h4>
										<div className='form-group' style={{ maxWidth: '24rem' }}>
											<input
												type='text'
												className='form-input'
												placeholder={t('stores.name')}
												value={newStoreName}
												onChange={(e) => setNewStoreName(e.target.value)}
												onKeyDown={(e) => e.key === 'Enter' && handleCreateStore()}
											/>
										</div>
										<div className='form-group' style={{ maxWidth: '24rem' }}>
											<input
												type='url'
												className='form-input'
												placeholder={t('stores.url')}
												value={newStoreUrl}
												onChange={(e) => setNewStoreUrl(e.target.value)}
											/>
										</div>
										<div className='form-group' style={{ maxWidth: '24rem' }}>
											<input
												type='url'
												className='form-input'
												placeholder={t('stores.logoUrl')}
												value={newStoreLogoUrl}
												onChange={(e) => setNewStoreLogoUrl(e.target.value)}
											/>
										</div>
										{household && (
											<label className='toggle-label' style={{ marginBottom: '0.75rem' }}>
												<input
													type='checkbox'
													checked={newStoreShared}
													onChange={(e) => setNewStoreShared(e.target.checked)}
												/>
												<span>{t('stores.shared')}</span>
											</label>
										)}
										<button
											className='btn btn-primary btn-sm'
											onClick={handleCreateStore}
											disabled={!newStoreName.trim()}>
											{t('stores.add')}
										</button>
									</div>
								</>
							)}
						</div>
					)}

					{activeSection === 'tags' && (
						<div className='settings-card'>
							<h2 className='settings-card-title'>{t('settings.tagsSection')}</h2>
							<p className='settings-card-description'>{t('settings.tagsSectionDesc')}</p>

							{tagsLoading ? (
								<p className='settings-card-description'>{t('settings.loading')}</p>
							) : (
								<>
									{/* Tags globales: el usuario puede cambiar su color y ocultarlas */}
									{tags.filter((tg) => tg.isGlobal).length > 0 && (
										<>
											<h4 className='settings-subsection-title'>{t('tags.globalTags')}</h4>
											<ul className='thresholds-list'>
												{tags
													.filter((tg) => tg.isGlobal)
													.map((tag) => (
														<li
															key={tag.id}
															className={`thresholds-list__item${tag.isHiddenGlobally ? ' tags-list__item--hidden' : ''}`}>
															<span className='thresholds-list__name'>
																<span
																	className='tags-color-dot'
																	style={{
																		background: tag.colorOverride ?? tag.color ?? '#6c757d',
																	}}
																/>
																{tag.name}
																{tag.isHiddenGlobally && (
																	<span className='settings-badge settings-badge--muted'>
																		{' '}
																		{t('tags.globalHiddenHint')}
																	</span>
																)}
															</span>
															<div className='thresholds-list__actions'>
																<label
																	className='tags-color-swatch'
																	title={t('tags.colorOverride')}
																	style={{
																		background: tag.colorOverride ?? tag.color ?? '#6c757d',
																	}}>
																	<input
																		type='color'
																		value={tag.colorOverride ?? tag.color ?? '#6c757d'}
																		onChange={(e) => handleColorOverride(tag, e.target.value)}
																	/>
																</label>
																<button
																	type='button'
																	className='btn-icon'
																	title={
																		tag.isHiddenGlobally
																			? t('tags.unhideGlobally')
																			: t('tags.hideGlobally')
																	}
																	onClick={() => handleToggleHideGlobal(tag)}>
																	{tag.isHiddenGlobally ? <HiOutlineEyeSlash /> : <HiOutlineEye />}
																</button>
															</div>
														</li>
													))}
											</ul>
										</>
									)}

									{/* Tags personales: el usuario puede crear, editar nombre+color y eliminar */}
									<h4 className='settings-subsection-title'>{t('tags.personalTags')}</h4>
									{tags.filter((tg) => !tg.isGlobal).length === 0 ? (
										<p className='settings-card-description'>{t('tags.noTags')}</p>
									) : (
										<ul className='thresholds-list'>
											{tags
												.filter((tg) => !tg.isGlobal)
												.map((tag) => (
													<li key={tag.id} className='thresholds-list__item'>
														{editingTagId === tag.id ? (
															<>
																<div className='tags-edit-row'>
																	<input
																		className='form-input form-input-sm'
																		value={editingTagName}
																		onChange={(e) => {
																			setEditingTagName(e.target.value)
																			setEditingTagError(null)
																		}}
																		autoFocus
																		onKeyDown={(e) => {
																			if (e.key === 'Enter') handleUpdateTag(tag.id)
																			if (e.key === 'Escape') setEditingTagId(null)
																		}}
																	/>
																	<label
																		className='tags-color-swatch'
																		title={t('tags.color')}
																		style={{ background: editingTagColor }}>
																		<input
																			type='color'
																			value={editingTagColor}
																			onChange={(e) => setEditingTagColor(e.target.value)}
																		/>
																	</label>
																</div>
																{editingTagError && (
																	<span className='tags-inline-error'>{editingTagError}</span>
																)}
																<div className='thresholds-list__actions'>
																	<button
																		type='button'
																		className='btn-icon'
																		onClick={() => handleUpdateTag(tag.id)}>
																		<HiOutlineCheck />
																	</button>
																	<button
																		type='button'
																		className='btn-icon'
																		onClick={() => setEditingTagId(null)}>
																		<HiOutlineXMark />
																	</button>
																</div>
															</>
														) : (
															<>
																<span className='thresholds-list__name'>
																	<span
																		className='tags-color-dot'
																		style={{ background: tag.color ?? '#6c757d' }}
																	/>
																	{tag.name}
																</span>
																<div className='thresholds-list__actions'>
																	<button
																		type='button'
																		className='btn-icon'
																		onClick={() => {
																			setEditingTagId(tag.id)
																			setEditingTagName(tag.name)
																			setEditingTagColor(tag.color ?? '#6c757d')
																			setEditingTagError(null)
																		}}>
																		<HiOutlinePencil />
																	</button>
																	<button
																		type='button'
																		className='btn-icon btn-icon--danger'
																		onClick={() => handleDeleteTag(tag.id)}>
																		<HiOutlineTrash />
																	</button>
																</div>
															</>
														)}
													</li>
												))}
										</ul>
									)}

									{/* Formulario para crear nueva tag personal */}
									<div className='settings-add-form'>
										<h4 className='settings-subsection-title'>{t('settings.tagsAdd')}</h4>
										<div className='tags-create-row'>
											<label
												className='tags-color-swatch'
												title={t('tags.color')}
												style={{ background: newTagColor }}>
												<input
													type='color'
													value={newTagColor}
													onChange={(e) => setNewTagColor(e.target.value)}
												/>
											</label>
											<input
												type='text'
												className='form-input'
												placeholder={t('tags.name')}
												value={newTagName}
												onChange={(e) => {
													setNewTagName(e.target.value)
													setNewTagError(null)
												}}
												onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
											/>
											<button
												className='btn btn-primary btn-sm'
												onClick={handleCreateTag}
												disabled={!newTagName.trim()}>
												<HiOutlinePlus />
												{t('add')}
											</button>
										</div>
										{newTagError && <span className='tags-inline-error'>{newTagError}</span>}
									</div>
								</>
							)}
						</div>
					)}

					{activeSection === 'display' && (
						<div className='settings-card'>
							<h2 className='settings-card-title'>{t('settings.displaySection')}</h2>
							<p className='settings-card-description'>{t('settings.displaySectionDesc')}</p>

							<div className='form-group' style={{ maxWidth: '16rem', marginTop: '1rem' }}>
								<label className='form-label'>{t('settings.itemsPerPage')}</label>
								<div className='page-size-options'>
									{PAGE_SIZE_OPTIONS.map((size) => (
										<button
											key={size}
											type='button'
											className={`page-size-btn ${pageSize === size ? 'active' : ''}`}
											onClick={() => {
												setStoredPageSize(size)
												setPageSizeState(size)
												toast.success(t('settings.configSaved'))
											}}>
											{size}
										</button>
									))}
								</div>
							</div>

							<div className='form-group' style={{ marginTop: '1.5rem' }}>
								<label className='form-label'>{t('settings.snoozeDuration')}</label>
								<div className='page-size-options'>
									{SNOOZE_OPTIONS.map((opt) => (
										<button
											key={opt.value}
											type='button'
											className={`page-size-btn ${snoozeDuration === opt.value ? 'active' : ''}`}
											onClick={() => {
												setStoredSnoozeDuration(opt.value)
												setSnoozeDurationState(opt.value)
												toast.success(t('settings.configSaved'))
											}}>
											{t(opt.labelKey)}
										</button>
									))}
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Modal: dejar de compartir tienda */}
			{unshareModal && (
				<div className='confirm-dialog-overlay' onClick={() => setUnshareModal(null)}>
					<div className='confirm-dialog' onClick={(e) => e.stopPropagation()}>
						<h3 className='confirm-dialog-title'>{t('stores.unshareTitle')}</h3>
						<p className='confirm-dialog-message'>
							{t('stores.unshareUsedBy', { names: unshareModal.userNames.join(', ') })}
						</p>
						<div
							className='confirm-dialog-actions'
							style={{ flexDirection: 'column', gap: '0.5rem' }}>
							<button
								type='button'
								className='btn btn-danger'
								disabled={unshareLoading}
								onClick={() => handleUnshare('duplicate')}>
								{t('stores.unshareOptionDuplicate')}
							</button>
							<button
								type='button'
								className='btn btn-danger'
								disabled={unshareLoading}
								onClick={() => handleUnshare('delete')}>
								{t('stores.unshareOptionDelete')}
							</button>
							<button
								type='button'
								className='btn btn-neutral'
								disabled={unshareLoading}
								onClick={() => setUnshareModal(null)}>
								{t('stores.unshareCancel')}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Modal: fusionar tiendas con mismo nombre */}
			{mergeModal && (
				<div className='confirm-dialog-overlay' onClick={() => setMergeModal(null)}>
					<div className='confirm-dialog' onClick={(e) => e.stopPropagation()}>
						<h3 className='confirm-dialog-title'>{t('stores.mergeTitle')}</h3>
						<p className='confirm-dialog-message'>
							{t('stores.mergeDesc', {
								other: mergeModal.otherUserName,
								name: mergeModal.storeName,
							})}
						</p>
						<div className='confirm-dialog-actions'>
							<button
								type='button'
								className='btn btn-primary'
								disabled={mergeLoading}
								onClick={handleMerge}>
								{t('stores.mergeYes')}
							</button>
							<button
								type='button'
								className='btn btn-neutral'
								disabled={mergeLoading}
								onClick={handleMergeDecline}>
								{t('stores.mergeNo')}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Modal: admin intentando salir con otros miembros */}
			{leaveAdminModal && household && (
				<div className='confirm-dialog-overlay'>
					<div className='confirm-dialog' onClick={(e) => e.stopPropagation()}>
						<h3 className='confirm-dialog-title'>{t('settings.leaveAdminTitle')}</h3>
						<p className='confirm-dialog-message'>{t('settings.leaveAdminMsg')}</p>

						<div style={{ marginBottom: '1rem' }}>
							<p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
								{t('settings.transferAdmin')}
							</p>
							<select
								className='form-input'
								value={selectedNewAdmin}
								onChange={(e) =>
									setSelectedNewAdmin(e.target.value === '' ? '' : Number(e.target.value))
								}>
								<option value=''>{t('settings.selectNewAdmin')}</option>
								{household.members
									.filter((m) => m.userId !== currentUserId)
									.map((m) => (
										<option key={m.userId} value={m.userId}>
											{m.user?.name ?? m.user?.email ?? `#${m.userId}`}
										</option>
									))}
							</select>
							<button
								type='button'
								className='btn btn-primary'
								style={{ marginTop: '0.5rem', width: '100%' }}
								disabled={leaveAdminLoading || selectedNewAdmin === ''}
								onClick={handleTransferAdmin}>
								{t('settings.transferAdminConfirm')}
							</button>
						</div>

						<hr
							style={{
								border: 'none',
								borderTop: '1px solid var(--border-color)',
								margin: '1rem 0',
							}}
						/>

						<div>
							<button
								type='button'
								className='btn btn-danger'
								style={{ width: '100%' }}
								disabled={leaveAdminLoading}
								onClick={handleDissolve}>
								{t('settings.dissolveHousehold')}
							</button>
						</div>

						<div style={{ marginTop: '0.75rem' }}>
							<button
								type='button'
								className='btn btn-neutral'
								style={{ width: '100%' }}
								disabled={leaveAdminLoading}
								onClick={() => setLeaveAdminModal(false)}>
								{t('cancel')}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
