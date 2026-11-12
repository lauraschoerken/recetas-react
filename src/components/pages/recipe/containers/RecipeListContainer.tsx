import './RecipeListContainer.scss'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { AddToWeekModal } from '@/components/shared/modals/AddToWeekModal'
import { Pagination } from '@/components/shared/pagination/Pagination'
import {
	PdfVariantsModal,
	PdfVariantsModalQuestion,
} from '@/components/shared/pdf-variants-modal/PdfVariantsModal'
import { RecipeImportSourceModal } from '@/components/shared/recipe-import-modal/RecipeImportSourceModal'
import { RecipeJsonTextModal } from '@/components/shared/recipe-import-modal/RecipeJsonTextModal'
import { authService } from '@/services/auth'
import { ingredientService } from '@/services/ingredient'
import { IngredientTag, ingredientTagService } from '@/services/ingredientExtras'
import { pdfService } from '@/services/pdf'
import { Recipe, recipeService } from '@/services/recipe'
import { useDialog } from '@/utils/dialog/DialogContext'
import { downloadJson } from '@/utils/exporters'
import { normalizeText } from '@/utils/normalize'
import { getStoredPageSize } from '@/utils/pagination/usePagination'

import { DEFAULT_FILTERS, RecipeFilters, RecipeFilterValues } from '../components/RecipeFilters'
import { RecipeList } from '../components/RecipeList'

// ── Tipos para el modal de selección de variantes al exportar PDF ──
interface MultiPdfModalState {
	questions: PdfVariantsModalQuestion[]
	selections: Record<string, number>
	cache: Record<number, any>
	rootIds: number[]
	merge: boolean
	loading: boolean
}

const mpKey = (recipeId: number, compId: number) => `${recipeId}:${compId}`
const mpDefaultOpt = (comp: any) =>
	(comp.options.find((o: any) => o.isDefault) || comp.options[0])?.id

async function buildMultiPdfQuestions(
	rootIds: number[],
	baseSelections: Record<string, number>,
	baseCache: Record<number, any>
): Promise<{
	questions: PdfVariantsModalQuestion[]
	selections: Record<string, number>
	cache: Record<number, any>
}> {
	const cache = { ...baseCache }
	const selections = { ...baseSelections }
	const questions: PdfVariantsModalQuestion[] = []

	const ensure = async (id: number) => {
		if (!cache[id]) cache[id] = await pdfService.getRecipeData(id)
		return cache[id]
	}

	for (const rootId of rootIds) {
		const rootData = await ensure(rootId)
		const rootTitle: string = rootData.title

		const walk = async (currentId: number, depth: number, visited: Set<number>) => {
			if (visited.has(currentId)) return
			visited.add(currentId)
			const data = await ensure(currentId)
			for (const comp of data.components || []) {
				const key = mpKey(currentId, comp.id)
				const defaultOptId = mpDefaultOpt(comp)
				if (!(key in selections)) {
					selections[key] = comp.isOptional && !comp.defaultEnabled ? 0 : (defaultOptId ?? 0)
				}
				questions.push({
					key,
					rootTitle,
					recipeId: currentId,
					recipeTitle: data.title,
					componentId: comp.id,
					componentName: comp.name,
					depth,
					isOptional: comp.isOptional ?? false,
					options: comp.options,
				})
				const selectedOptId = key in selections ? selections[key] : defaultOptId
				const selectedOpt =
					selectedOptId !== 0 ? comp.options.find((o: any) => o.id === selectedOptId) : null
				const childId = selectedOpt?.recipe?.id
				if (childId) await walk(childId, depth + 1, visited)
			}
		}

		await walk(rootId, 0, new Set<number>())
	}

	return { questions, selections, cache }
}

export function RecipeListContainer() {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const [searchParams, setSearchParams] = useSearchParams()
	const { confirm, toast } = useDialog()
	const [recipes, setRecipes] = useState<Recipe[]>([])
	const [total, setTotal] = useState(0)
	const [hiddenTotal, setHiddenTotal] = useState(0)
	const [loading, setLoading] = useState(true)
	const [initialLoad, setInitialLoad] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
	const [modalOpen, setModalOpen] = useState(false)
	const [pageSize] = useState(() => getStoredPageSize('recipes'))
	const [availableTags, setAvailableTags] = useState<IngredientTag[]>([])
	const [authors, setAuthors] = useState<{ id: number; name: string }[]>([])
	const [importReview, setImportReview] = useState<{
		file: File
		conflicts: Array<{
			key: string
			recipeTitle: string
			ingredientName: string
			importedId: number | null
			importedName: string
			candidates: Array<{ id: number; name: string }>
		}>
		resolutions: Record<
			string,
			{ ingredientId?: number | null; name?: string; createNew?: boolean }
		>
	} | null>(null)
	const [importSearchByConflict, setImportSearchByConflict] = useState<Record<string, string>>({})
	const [importSearchResults, setImportSearchResults] = useState<
		Record<string, Array<{ id: number; name: string }>>
	>({})
	const importSearchTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
	const importSearchRequests = useRef<Record<string, number>>({})
	const currentUser = authService.getUser()

	// Selección múltiple
	const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
	const [multiPdfModal, setMultiPdfModal] = useState<MultiPdfModalState | null>(null)

	const currentPage = parseInt(searchParams.get('page') || '1', 10)
	const search = searchParams.get('q') || ''
	const [filtersOpen, setFiltersOpen] = useState(false)

	// Leer filtros desde URL
	const [filters, setFilters] = useState<RecipeFilterValues>({
		hidden: searchParams.get('hidden') === 'only' ? 'only' : 'exclude',
		visibility: (searchParams.get('visibility') as RecipeFilterValues['visibility']) || 'all',
		minCalories: searchParams.get('minCal') || '',
		maxCalories: searchParams.get('maxCal') || '',
		minProtein: searchParams.get('minProt') || '',
		maxProtein: searchParams.get('maxProt') || '',
		minCarbs: searchParams.get('minCarbs') || '',
		maxCarbs: searchParams.get('maxCarbs') || '',
		minFat: searchParams.get('minFat') || '',
		maxFat: searchParams.get('maxFat') || '',
		minFiber: searchParams.get('minFiber') || '',
		maxFiber: searchParams.get('maxFiber') || '',
		difficulty: (searchParams.get('difficulty') as RecipeFilterValues['difficulty']) || '',
		minCookTime: searchParams.get('minCook') || '',
		maxCookTime: searchParams.get('maxCook') || '',
		ingredient: searchParams.get('ingredient') || '',
		tagIds: searchParams.get('tags')
			? searchParams
					.get('tags')!
					.split(',')
					.map(Number)
					.filter((n) => !isNaN(n) && n > 0)
			: [],
		excludeTagIds: searchParams.get('exTags')
			? searchParams
					.get('exTags')!
					.split(',')
					.map(Number)
					.filter((n) => !isNaN(n) && n > 0)
			: [],
		sortBy: (searchParams.get('sortBy') as RecipeFilterValues['sortBy']) || 'createdAt',
		sortOrder: (searchParams.get('sortOrder') as RecipeFilterValues['sortOrder']) || 'desc',
		authorId: searchParams.get('author') ? Number(searchParams.get('author')) : null,
	})

	const activeFilterCount = [
		filters.hidden === 'only',
		filters.visibility !== 'all',
		filters.minCalories,
		filters.maxCalories,
		filters.minProtein,
		filters.maxProtein,
		filters.minCarbs,
		filters.maxCarbs,
		filters.minFat,
		filters.maxFat,
		filters.minFiber,
		filters.maxFiber,
		filters.difficulty,
		filters.minCookTime,
		filters.maxCookTime,
		filters.ingredient,
		filters.tagIds.length > 0,
		filters.excludeTagIds.length > 0,
		filters.authorId != null,
	].filter(Boolean).length

	// Cargar tags disponibles
	useEffect(() => {
		ingredientTagService
			.getAll()
			.catch(() => [])
			.then(setAvailableTags)
	}, [])

	useEffect(() => {
		recipeService
			.getAuthors(filters.hidden)
			.catch(() => [])
			.then(setAuthors)
	}, [filters.hidden])

	const loadRecipes = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			const result = await recipeService.getAllPaginated({
				page: currentPage,
				pageSize,
				search: normalizeText(search),
				visibility: filters.visibility,
				hidden: filters.hidden,
				ingredient: filters.ingredient,
				difficulty: filters.difficulty || undefined,
				minCookTime: filters.minCookTime ? Number(filters.minCookTime) : undefined,
				maxCookTime: filters.maxCookTime ? Number(filters.maxCookTime) : undefined,
				tagIds: filters.tagIds,
				excludeTagIds: filters.excludeTagIds,
				sortBy: filters.sortBy,
				sortOrder: filters.sortOrder,
				authorId: filters.authorId,
			})
			setRecipes(result.data)
			setTotal(result.total)
			setHiddenTotal(result.hiddenTotal)
		} catch {
			setError(t('recipes.loadError'))
		} finally {
			setLoading(false)
			setInitialLoad(false)
		}
	}, [currentPage, pageSize, search, filters, t])

	useEffect(() => {
		loadRecipes()
	}, [loadRecipes])

	const handleDelete = async (id: number) => {
		const recipeToDelete = recipes.find((recipe) => recipe.id === id)
		const deletingAsAdmin =
			authService.isAdmin() && recipeToDelete?.userId !== authService.getUser()?.id
		const confirmed = await confirm({
			title: t('recipes.deleteTitle'),
			message:
				deletingAsAdmin && recipeToDelete
					? t('recipes.adminDeleteConfirm', {
							title: recipeToDelete.title,
							owner: recipeToDelete.authorName || `#${recipeToDelete.userId}`,
						})
					: t('recipes.deleteConfirm'),
			confirmText: t('delete'),
			type: 'danger',
		})
		if (!confirmed) return

		try {
			await recipeService.delete(id)
			setRecipes(recipes.filter((r) => r.id !== id))
			setTotal((prev) => prev - 1)
			toast.success(t('recipes.deleted'))
		} catch {
			toast.error(t('recipes.deleteError'))
		}
	}

	const handleHide = async (recipe: Recipe) => {
		const confirmed = await confirm({
			title: t('recipes.hideTitle'),
			message: t('recipes.hideConfirm', { title: recipe.title }),
			confirmText: t('recipes.hide'),
		})
		if (!confirmed) return

		try {
			await recipeService.hide(recipe.id)
			setSelectedIds((prev) => {
				const next = new Set(prev)
				next.delete(recipe.id)
				return next
			})
			await loadRecipes()
			toast.success(t('recipes.hidden'))
		} catch {
			toast.error(t('recipes.hideError'))
		}
	}

	const handleUnhide = async (recipe: Recipe) => {
		try {
			await recipeService.unhide(recipe.id)
			setSelectedIds((prev) => {
				const next = new Set(prev)
				next.delete(recipe.id)
				return next
			})
			if (recipes.length === 1 && currentPage > 1) {
				setSearchParams(
					(prev) => {
						const p = new URLSearchParams(prev)
						p.set('page', String(currentPage - 1))
						return p
					},
					{ replace: true }
				)
			} else {
				await loadRecipes()
			}
			toast.success(t('recipes.unhidden'))
		} catch {
			toast.error(t('recipes.unhideError'))
		}
	}

	const handleSearch = (value: string) => {
		setSearchParams(
			(prev) => {
				const p = new URLSearchParams(prev)
				p.set('q', value)
				p.set('page', '1')
				return p
			},
			{ replace: true }
		)
	}

	const handleFiltersChange = (newFilters: RecipeFilterValues) => {
		setFilters(newFilters)
		setSearchParams(
			(prev) => {
				const p = new URLSearchParams(prev)
				p.set('page', '1')

				const setOrDel = (key: string, val: string | undefined) =>
					val ? p.set(key, val) : p.delete(key)

				setOrDel('hidden', newFilters.hidden === 'only' ? 'only' : undefined)
				setOrDel('visibility', newFilters.visibility !== 'all' ? newFilters.visibility : undefined)
				setOrDel('minCal', newFilters.minCalories || undefined)
				setOrDel('maxCal', newFilters.maxCalories || undefined)
				setOrDel('minProt', newFilters.minProtein || undefined)
				setOrDel('maxProt', newFilters.maxProtein || undefined)
				setOrDel('minCarbs', newFilters.minCarbs || undefined)
				setOrDel('maxCarbs', newFilters.maxCarbs || undefined)
				setOrDel('minFat', newFilters.minFat || undefined)
				setOrDel('maxFat', newFilters.maxFat || undefined)
				setOrDel('minFiber', newFilters.minFiber || undefined)
				setOrDel('maxFiber', newFilters.maxFiber || undefined)
				setOrDel('difficulty', newFilters.difficulty || undefined)
				setOrDel('minCook', newFilters.minCookTime || undefined)
				setOrDel('maxCook', newFilters.maxCookTime || undefined)
				setOrDel('ingredient', newFilters.ingredient || undefined)
				setOrDel('tags', newFilters.tagIds.length > 0 ? newFilters.tagIds.join(',') : undefined)
				setOrDel(
					'exTags',
					newFilters.excludeTagIds.length > 0 ? newFilters.excludeTagIds.join(',') : undefined
				)
				setOrDel('sortBy', newFilters.sortBy !== 'createdAt' ? newFilters.sortBy : undefined)
				setOrDel('sortOrder', newFilters.sortOrder !== 'desc' ? newFilters.sortOrder : undefined)
				setOrDel('author', newFilters.authorId != null ? String(newFilters.authorId) : undefined)

				return p
			},
			{ replace: true }
		)
	}

	const handleFiltersClear = () => {
		setFilters(DEFAULT_FILTERS)
		setSearchParams(
			(prev) => {
				const p = new URLSearchParams(prev)
				for (const key of [
					'hidden',
					'visibility',
					'minCal',
					'maxCal',
					'minProt',
					'maxProt',
					'minCarbs',
					'maxCarbs',
					'minFat',
					'maxFat',
					'minFiber',
					'maxFiber',
					'difficulty',
					'minCook',
					'maxCook',
					'ingredient',
					'tags',
					'exTags',
					'sortBy',
					'sortOrder',
					'author',
				]) {
					p.delete(key)
				}
				p.set('page', '1')
				return p
			},
			{ replace: true }
		)
	}

	const handleAddToWeek = (recipe: Recipe) => {
		setSelectedRecipe(recipe)
		setModalOpen(true)
	}

	const importFileRef = useRef<HTMLInputElement>(null)
	const [showImportSourceModal, setShowImportSourceModal] = useState(false)
	const [showImportTextModal, setShowImportTextModal] = useState(false)
	const [importJsonText, setImportJsonText] = useState('')
	const [importJsonTextError, setImportJsonTextError] = useState('')

	const handleToggleSelect = (id: number) => {
		setSelectedIds((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}

	const handleExportSelectedPdf = async () => {
		if (selectedIds.size === 0) return
		try {
			const rootIds = Array.from(selectedIds)
			const built = await buildMultiPdfQuestions(rootIds, {}, {})

			if (built.questions.length === 0) {
				const pdfOptions = {
					showAuthor: localStorage.getItem('pdfShowAuthor') === 'true',
					showVisibility: localStorage.getItem('pdfShowVisibility') === 'true',
				}
				await pdfService.downloadCombinedPdf(
					rootIds.map((id) => ({ recipeId: id, selectedOptions: {} })),
					pdfOptions
				)
				toast.success(t('recipes.pdfDownloaded'))
				return
			}

			setMultiPdfModal({
				questions: built.questions,
				selections: built.selections,
				cache: built.cache,
				rootIds,
				merge: rootIds.length > 1,
				loading: false,
			})
		} catch {
			toast.error(t('recipes.pdfError'))
		}
	}

	const handleExportSelectedJson = async () => {
		if (selectedIds.size === 0) return
		try {
			const ids = Array.from(selectedIds)
			const data = await Promise.all(ids.map((id) => recipeService.getById(id)))
			downloadJson(data, `recetas-${new Date().toISOString().slice(0, 10)}.json`)
			toast.success(t('recipes.jsonDownloaded'))
		} catch {
			toast.error(t('recipes.exportError'))
		}
	}

	const handleMultiPdfChange = async (question: PdfVariantsModalQuestion, value: number) => {
		if (!multiPdfModal) return
		setMultiPdfModal((m) => (m ? { ...m, loading: true } : m))
		try {
			const nextSelections = { ...multiPdfModal.selections, [question.key]: value }
			const built = await buildMultiPdfQuestions(
				multiPdfModal.rootIds,
				nextSelections,
				multiPdfModal.cache
			)
			setMultiPdfModal((m) =>
				m
					? {
							...m,
							questions: built.questions,
							selections: built.selections,
							cache: built.cache,
							loading: false,
						}
					: m
			)
		} catch {
			toast.error(t('recipes.pdfError'))
			setMultiPdfModal((m) => (m ? { ...m, loading: false } : m))
		}
	}

	const confirmMultiPdfDownload = async () => {
		if (!multiPdfModal) return
		const pdfOptions = {
			showAuthor: localStorage.getItem('pdfShowAuthor') === 'true',
			showVisibility: localStorage.getItem('pdfShowVisibility') === 'true',
		}
		try {
			const { cache, selections, rootIds, merge } = multiPdfModal

			const collectEntries = (
				recipeId: number,
				visited: Set<number>
			): { recipeId: number; selectedOptions: Record<number, number> }[] => {
				if (visited.has(recipeId) || !cache[recipeId]) return []
				visited.add(recipeId)
				const data = cache[recipeId]
				const selectedOptions: Record<number, number> = {}
				for (const comp of data.components || []) {
					const key = mpKey(recipeId, comp.id)
					const val = key in selections ? selections[key] : mpDefaultOpt(comp)
					if (val && val !== 0) selectedOptions[comp.id] = val
				}
				const children: { recipeId: number; selectedOptions: Record<number, number> }[] = []
				for (const comp of data.components || []) {
					const selectedOpt = comp.options.find((o: any) => o.id === selectedOptions[comp.id])
					const childId = selectedOpt?.recipe?.id
					if (childId && cache[childId]) children.push(...collectEntries(childId, visited))
				}
				return [{ recipeId, selectedOptions }, ...children]
			}

			if (merge) {
				const visited = new Set<number>()
				const allEntries = rootIds.flatMap((id) => collectEntries(id, visited))
				await pdfService.downloadCombinedPdf(allEntries, pdfOptions)
			} else {
				for (const rootId of rootIds) {
					const visited = new Set<number>()
					const entries = collectEntries(rootId, visited)
					for (const entry of entries) {
						await pdfService.downloadRecipePdf(entry.recipeId, {
							...pdfOptions,
							selectedOptions: entry.selectedOptions,
						})
					}
				}
			}

			setMultiPdfModal(null)
			toast.success(t('recipes.pdfDownloaded'))
		} catch {
			toast.error(t('recipes.pdfError'))
		}
	}

	const handleExportSelectedCsv = async () => {
		if (selectedIds.size === 0) return
		try {
			await recipeService.exportCsv(Array.from(selectedIds))
			setShowExportModal(false)
		} catch {
			toast.error(t('recipes.exportError'))
		}
	}

	const [showExportModal, setShowExportModal] = useState(false)

	const handleImportCsv = async (file: File, inputEl: HTMLInputElement) => {
		try {
			const result = await recipeService.importFromCsv(file)
			if (result.importedCount > 0) {
				toast.success(t('recipes.importedCsv', { count: result.importedCount }))
			}
			if (result.skipped.length === 1) {
				const s = result.skipped[0]
				const goEdit = await confirm({
					title: t('recipes.duplicateTitle'),
					message: t('recipes.duplicateMessage', { title: s.title }),
					confirmText: t('recipes.duplicateGoEdit'),
					type: 'info',
				})
				if (goEdit) navigate(`/recipes/${s.id}/edit`)
			} else if (result.skipped.length > 1) {
				toast.info(
					t('recipes.skippedMany', {
						count: result.skipped.length,
						titles: result.skipped.map((s) => s.title).join(', '),
					})
				)
			} else if (result.importedCount === 0) {
				toast.info(t('recipes.importedNone'))
			}
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : t('recipes.importCsvError'))
		} finally {
			loadRecipes()
			inputEl.value = ''
		}
	}

	const handleImportJson = async (file: File, inputEl: HTMLInputElement) => {
		try {
			const review = await recipeService.reviewImportJson(file)
			if (review.needsReview && review.conflicts.length > 0) {
				setImportReview({
					file,
					conflicts: review.conflicts,
					resolutions: {},
				})
				inputEl.value = ''
				return
			}

			const result = await recipeService.importFromJson(file)
			if (result.importedCount > 0) {
				toast.success(t('recipes.importedJson', { count: result.importedCount }))
			}
			if (result.skipped.length > 0) {
				toast.info(
					t('recipes.skippedMany', {
						count: result.skipped.length,
						titles: result.skipped.map((s) => s.title).join(', '),
					})
				)
			} else if (result.importedCount === 0) {
				toast.info(t('recipes.importedNone'))
			}
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : ''
			toast.error(
				/prisma\.recipeIngredient\.create|Unique constraint failed/i.test(message)
					? t('recipes.importDuplicateIngredientError')
					: message || t('recipes.importJsonError')
			)
		} finally {
			loadRecipes()
			inputEl.value = ''
		}
	}

	const handleImportJsonText = async () => {
		const text = importJsonText.trim()
		if (!text) {
			setImportJsonTextError(t('recipes.importJsonTextEmpty'))
			return
		}
		try {
			JSON.parse(text)
		} catch {
			setImportJsonTextError(t('recipes.importJsonTextInvalid'))
			return
		}

		const file = new File([text], 'imported-recipes.json', { type: 'application/json' })
		try {
			const review = await recipeService.reviewImportJsonText(text)
			if (review.needsReview && review.conflicts.length > 0) {
				setImportReview({
					file,
					conflicts: review.conflicts,
					resolutions: {},
				})
				setShowImportSourceModal(false)
				setImportJsonText('')
				setImportJsonTextError('')
				return
			}

			const result = await recipeService.importFromJsonText(text)
			if (result.importedCount > 0) {
				toast.success(t('recipes.importedJson', { count: result.importedCount }))
			}
			if (result.skipped.length > 0) {
				toast.info(
					t('recipes.skippedMany', {
						count: result.skipped.length,
						titles: result.skipped.map((s) => s.title).join(', '),
					})
				)
			} else if (result.importedCount === 0) {
				toast.info(t('recipes.importedNone'))
			}
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : ''
			toast.error(
				/prisma\.recipeIngredient\.create|Unique constraint failed/i.test(message)
					? t('recipes.importDuplicateIngredientError')
					: message || t('recipes.importJsonError')
			)
		} finally {
			loadRecipes()
			setShowImportSourceModal(false)
			setShowImportTextModal(false)
			setImportJsonText('')
			setImportJsonTextError('')
		}
	}

	const handleImportReviewConfirm = async () => {
		if (!importReview) return
		const hasUnresolved = importReview.conflicts.some(
			(conflict) => !importReview.resolutions[conflict.key]
		)
		if (hasUnresolved) {
			toast.error(t('recipes.importReviewResolveAll'))
			return
		}
		try {
			const result = await recipeService.importFromJson(importReview.file, importReview.resolutions)
			if (result.importedCount > 0) {
				toast.success(t('recipes.importedJson', { count: result.importedCount }))
			}
			if (result.skipped.length > 0) {
				toast.info(
					t('recipes.skippedMany', {
						count: result.skipped.length,
						titles: result.skipped.map((s) => s.title).join(', '),
					})
				)
			} else if (result.importedCount === 0) {
				toast.info(t('recipes.importedNone'))
			}
			setImportReview(null)
			setImportSearchByConflict({})
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : ''
			toast.error(
				/prisma\.recipeIngredient\.create|Unique constraint failed/i.test(message)
					? t('recipes.importDuplicateIngredientError')
					: message || t('recipes.importJsonError')
			)
		} finally {
			loadRecipes()
		}
	}

	const getConflictCandidates = (conflict: {
		key: string
		candidates: Array<{ id: number; name: string }>
	}) => {
		const query = (importSearchByConflict[conflict.key] ?? '').trim().toLowerCase()
		if (!query) return conflict.candidates
		return (
			importSearchResults[conflict.key] ??
			conflict.candidates.filter((candidate) =>
				normalizeText(candidate.name).includes(normalizeText(query))
			)
		)
	}

	const handleImportIngredientSearch = (conflictKey: string, value: string) => {
		setImportSearchByConflict((prev) => ({ ...prev, [conflictKey]: value }))
		const requestId = (importSearchRequests.current[conflictKey] ?? 0) + 1
		importSearchRequests.current[conflictKey] = requestId
		if (importSearchTimers.current[conflictKey]) {
			clearTimeout(importSearchTimers.current[conflictKey])
		}

		const query = value.trim()
		if (!query) {
			setImportSearchResults((prev) => {
				const next = { ...prev }
				delete next[conflictKey]
				return next
			})
			return
		}

		importSearchTimers.current[conflictKey] = setTimeout(async () => {
			try {
				const results = await ingredientService.search(query)
				if (importSearchRequests.current[conflictKey] !== requestId) return
				setImportSearchResults((prev) => ({
					...prev,
					[conflictKey]: results.map(({ id, name }) => ({ id, name })),
				}))
			} catch {
				if (importSearchRequests.current[conflictKey] !== requestId) return
				setImportSearchResults((prev) => ({ ...prev, [conflictKey]: [] }))
			}
		}, 250)
	}

	const handleImportPdf = async (file: File, inputEl: HTMLInputElement) => {
		try {
			const result = await pdfService.importRecipesFromPdf(file)
			if (result.importedCount > 0) {
				toast.success(t('recipes.imported'))
			}
			if (result.skipped.length === 1) {
				const s = result.skipped[0]
				const goEdit = await confirm({
					title: t('recipes.duplicateTitle'),
					message: t('recipes.duplicateMessage', { title: s.title }),
					confirmText: t('recipes.duplicateGoEdit'),
					type: 'info',
				})
				if (goEdit) navigate(`/recipes/${s.id}/edit`)
			} else if (result.skipped.length > 1) {
				toast.info(
					t('recipes.skippedMany', {
						count: result.skipped.length,
						titles: result.skipped.map((s) => s.title).join(', '),
					})
				)
			} else if (result.importedCount === 0) {
				toast.info(t('recipes.importedNone'))
			}
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : t('recipes.importError'))
		} finally {
			loadRecipes()
			inputEl.value = ''
		}
	}

	const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return
		const lower = file.name.toLowerCase()
		if (lower.endsWith('.csv') || file.type === 'text/csv') {
			await handleImportCsv(file, e.target)
			return
		}
		if (lower.endsWith('.json') || file.type === 'application/json') {
			await handleImportJson(file, e.target)
			return
		}
		await handleImportPdf(file, e.target)
	}

	if (loading && initialLoad) {
		return (
			<div className='recipe-page-state' role='status'>
				{t('recipes.loading')}
			</div>
		)
	}
	if (error) {
		return (
			<div className='recipe-page-state recipe-page-state--error' role='alert'>
				<p>{error}</p>
				<button type='button' className='btn btn-outline' onClick={() => void loadRecipes()}>
					{t('retry')}
				</button>
			</div>
		)
	}

	// Filtro client-side de macros (los calcula el servidor pero no filtra por ellos)
	const applyClientFilters = (list: Recipe[]) => {
		return list.filter((r) => {
			const kcal = r.caloriesPerServing ?? r.nutritionPerServing?.calories ?? null
			const prot = r.nutritionPerServing?.protein ?? null
			const carbs = r.nutritionPerServing?.carbs ?? null
			const fat = r.nutritionPerServing?.fat ?? null

			if (filters.minCalories && kcal != null && kcal < Number(filters.minCalories)) return false
			if (filters.maxCalories && kcal != null && kcal > Number(filters.maxCalories)) return false
			if (filters.minProtein && prot != null && prot < Number(filters.minProtein)) return false
			if (filters.maxProtein && prot != null && prot > Number(filters.maxProtein)) return false
			if (filters.minCarbs && carbs != null && carbs < Number(filters.minCarbs)) return false
			if (filters.maxCarbs && carbs != null && carbs > Number(filters.maxCarbs)) return false
			if (filters.minFat && fat != null && fat < Number(filters.minFat)) return false
			if (filters.maxFat && fat != null && fat > Number(filters.maxFat)) return false
			const fiber = r.nutritionPerServing?.fiber
			if (filters.minFiber && fiber != null && fiber < Number(filters.minFiber)) return false
			if (filters.maxFiber && fiber != null && fiber > Number(filters.maxFiber)) return false
			return true
		})
	}

	const visibleRecipes = applyClientFilters(recipes)
	const rangeLabel = (label: string, min: string, max: string, unit: string) =>
		`${label}: ${min || '0'}–${max || '∞'}${unit ? ` ${unit}` : ''}`
	const activeFilterChips: { key: string; label: string; clear: () => void }[] = []
	if (filters.visibility !== 'all') {
		activeFilterChips.push({
			key: 'visibility',
			label: `${t('recipes.filterVisibility')}: ${t(filters.visibility)}`,
			clear: () => handleFiltersChange({ ...filters, visibility: 'all' }),
		})
	}
	if (filters.difficulty) {
		activeFilterChips.push({
			key: 'difficulty',
			label: `${t('recipes.difficultyLabel')}: ${t(`recipes.difficulty${filters.difficulty.charAt(0).toUpperCase() + filters.difficulty.slice(1)}`)}`,
			clear: () => handleFiltersChange({ ...filters, difficulty: '' }),
		})
	}
	if (filters.ingredient) {
		activeFilterChips.push({
			key: 'ingredient',
			label: `${t('recipes.filterIngredient')}: ${filters.ingredient}`,
			clear: () => handleFiltersChange({ ...filters, ingredient: '' }),
		})
	}
	if (filters.authorId != null) {
		activeFilterChips.push({
			key: 'author',
			label: `${t('recipes.filterAuthor')}: ${authors.find((a) => a.id === filters.authorId)?.name || `#${filters.authorId}`}`,
			clear: () => handleFiltersChange({ ...filters, authorId: null }),
		})
	}
	if (filters.minCookTime || filters.maxCookTime) {
		activeFilterChips.push({
			key: 'cook-time',
			label: rangeLabel(
				t('recipes.filterCookTime'),
				filters.minCookTime,
				filters.maxCookTime,
				t('recipes.minuteShort')
			),
			clear: () => handleFiltersChange({ ...filters, minCookTime: '', maxCookTime: '' }),
		})
	}
	if (filters.minCalories || filters.maxCalories) {
		activeFilterChips.push({
			key: 'calories',
			label: rangeLabel(
				t('recipes.filterCalories'),
				filters.minCalories,
				filters.maxCalories,
				'kcal'
			),
			clear: () => handleFiltersChange({ ...filters, minCalories: '', maxCalories: '' }),
		})
	}
	if (filters.minProtein || filters.maxProtein) {
		activeFilterChips.push({
			key: 'protein',
			label: rangeLabel(t('weekPlan.protein'), filters.minProtein, filters.maxProtein, 'g'),
			clear: () => handleFiltersChange({ ...filters, minProtein: '', maxProtein: '' }),
		})
	}
	if (filters.minCarbs || filters.maxCarbs) {
		activeFilterChips.push({
			key: 'carbs',
			label: rangeLabel(t('weekPlan.carbs'), filters.minCarbs, filters.maxCarbs, 'g'),
			clear: () => handleFiltersChange({ ...filters, minCarbs: '', maxCarbs: '' }),
		})
	}
	if (filters.minFat || filters.maxFat) {
		activeFilterChips.push({
			key: 'fat',
			label: rangeLabel(t('weekPlan.fat'), filters.minFat, filters.maxFat, 'g'),
			clear: () => handleFiltersChange({ ...filters, minFat: '', maxFat: '' }),
		})
	}
	if (filters.minFiber || filters.maxFiber) {
		activeFilterChips.push({
			key: 'fiber',
			label: rangeLabel(t('fiber'), filters.minFiber, filters.maxFiber, 'g'),
			clear: () => handleFiltersChange({ ...filters, minFiber: '', maxFiber: '' }),
		})
	}
	if (filters.tagIds.length || filters.excludeTagIds.length) {
		activeFilterChips.push({
			key: 'tags',
			label: `${t('recipes.filterTags')}: ${filters.tagIds.length + filters.excludeTagIds.length}`,
			clear: () => handleFiltersChange({ ...filters, tagIds: [], excludeTagIds: [] }),
		})
	}

	return (
		<>
			<div className='page-header'>
				<h1 className='page-title'>{t('recipes.title')}</h1>
				<div className='page-header-actions'>
					<button
						type='button'
						className='btn btn-outline'
						onClick={() => setShowImportSourceModal(true)}>
						{t('recipes.import')}
					</button>
					<Link to='/recipes/new' className='btn btn-primary'>
						{t('recipes.new')}
					</Link>
				</div>
			</div>

			<RecipeImportSourceModal
				isOpen={showImportSourceModal}
				onClose={() => setShowImportSourceModal(false)}
				onImportFromFile={() => {
					requestAnimationFrame(() => importFileRef.current?.click())
				}}
				onImportFromText={() => {
					setImportJsonTextError('')
					setShowImportTextModal(true)
				}}
			/>

			<RecipeJsonTextModal
				isOpen={showImportTextModal}
				value={importJsonText}
				error={importJsonTextError}
				onChange={setImportJsonText}
				onClose={() => {
					setShowImportTextModal(false)
					setImportJsonText('')
					setImportJsonTextError('')
				}}
				onSubmit={handleImportJsonText}
			/>

			<input
				type='file'
				accept='.pdf,application/pdf,.csv,text/csv,.json,application/json'
				ref={importFileRef}
				onChange={handleImportFile}
				style={{ display: 'none' }}
			/>

			{selectedIds.size > 0 && (
				<div className='recipe-selection-bar'>
					<span className='recipe-selection-bar__count'>
						{t('recipes.selected', { count: selectedIds.size })}
					</span>
					<button
						className='btn btn-outline btn-sm'
						onClick={() => setSelectedIds(new Set(visibleRecipes.map((r) => r.id)))}>
						{t('recipes.selectAll')}
					</button>
					<button className='btn btn-outline btn-sm' onClick={() => setShowExportModal(true)}>
						{t('recipes.exportPdfSelected')}
					</button>
					<button className='btn btn-outline btn-sm' onClick={() => setSelectedIds(new Set())}>
						{t('recipes.deselectAll')}
					</button>
				</div>
			)}

			<div className='recipe-library-toolbar'>
				<div className='search-bar-container'>
					<input
						type='search'
						className='form-input'
						placeholder={t('search')}
						aria-label={t('search')}
						value={search}
						onChange={(e) => handleSearch(e.target.value)}
					/>
					<button
						type='button'
						className={`btn btn-outline recipe-filter-toggle${activeFilterCount > 0 ? ' active' : ''}`}
						onClick={() => setFiltersOpen((o) => !o)}>
						{t('recipes.filters')}
						{activeFilterCount > 0 && (
							<span className='recipe-filter-badge'>{activeFilterCount}</span>
						)}
					</button>
				</div>
				{activeFilterChips.length > 0 && (
					<div className='recipe-active-filters' aria-label={t('recipes.filters')}>
						{activeFilterChips.map((chip) => (
							<span key={chip.key} className='recipe-active-filter'>
								{chip.label}
								<button
									type='button'
									onClick={chip.clear}
									aria-label={`${t('recipes.filterClear')}: ${chip.label}`}>
									×
								</button>
							</span>
						))}
					</div>
				)}
			</div>

			{filtersOpen && (
				<RecipeFilters
					filters={filters}
					availableTags={availableTags}
					authors={authors}
					onChange={handleFiltersChange}
					onClear={handleFiltersClear}
					activeCount={activeFilterCount}
					hiddenTotal={hiddenTotal}
				/>
			)}

			<p className='recipe-results-summary' aria-live='polite'>
				{t('recipes.resultsCount', { count: visibleRecipes.length })}
			</p>
			<div className='recipe-results' aria-busy={loading}>
				{loading && <span className='recipe-results-loading'>{t('recipes.loading')}</span>}
				<RecipeList
					recipes={visibleRecipes}
					currentUserId={currentUser?.id || 0}
					onDelete={handleDelete}
					onAddToWeek={handleAddToWeek}
					selectedIds={selectedIds}
					onToggleSelect={handleToggleSelect}
					onHide={filters.hidden === 'exclude' ? handleHide : undefined}
					onUnhide={filters.hidden === 'only' ? handleUnhide : undefined}
					showingHidden={filters.hidden === 'only'}
				/>
			</div>

			{showExportModal && (
				<div className='modal-overlay' onClick={() => setShowExportModal(false)}>
					<div className='modal-card' onClick={(e) => e.stopPropagation()}>
						<h3>{t('recipes.exportPdfSelected')}</h3>
						<div className='export-modal-actions'>
							<button
								className='btn btn-outline'
								onClick={() => {
									setShowExportModal(false)
									void handleExportSelectedPdf()
								}}>
								{t('recipes.exportPdfSelected')}
							</button>
							<button
								className='btn btn-outline'
								onClick={() => {
									setShowExportModal(false)
									void handleExportSelectedJson()
								}}>
								{t('recipes.exportJson')}
							</button>
							<button
								className='btn btn-outline'
								onClick={() => {
									setShowExportModal(false)
									void handleExportSelectedCsv()
								}}>
								{t('recipes.exportCsv')}
							</button>
							<button className='btn btn-secondary' onClick={() => setShowExportModal(false)}>
								{t('cancel')}
							</button>
						</div>
					</div>
				</div>
			)}

			{importReview && (
				<div className='modal-overlay import-review-overlay' onClick={() => setImportReview(null)}>
					<div
						className='import-review-modal'
						role='dialog'
						aria-modal='true'
						aria-labelledby='import-review-title'
						onClick={(e) => e.stopPropagation()}>
						<header className='import-review-header'>
							<div>
								<h3 id='import-review-title'>{t('recipes.importReviewTitle')}</h3>
								<p>{t('recipes.importReviewDescription')}</p>
							</div>
							<button
								type='button'
								className='import-review-close'
								onClick={() => setImportReview(null)}
								aria-label={t('cancel')}>
								×
							</button>
						</header>

						<div className='import-review-list'>
							{importReview.conflicts.map((conflict) => {
								const candidates = getConflictCandidates(conflict)
								const chosen = importReview.resolutions[conflict.key]
								return (
									<article key={conflict.key} className='import-review-item'>
										<div className='import-review-item-heading'>
											<h4>{conflict.ingredientName}</h4>
											<button
												type='button'
												className={`btn ${chosen?.createNew ? 'btn-primary' : 'btn-outline'} btn-sm`}
												onClick={() => {
													setImportReview((prev) => {
														if (!prev) return prev
														return {
															...prev,
															resolutions: {
																...prev.resolutions,
																[conflict.key]: { name: conflict.ingredientName, createNew: true },
															},
														}
													})
												}}>
												{t('recipes.importReviewCreateNew')}
											</button>
										</div>

										<div className='import-review-search'>
											<div className='import-review-meta'>
												<span>
													{t('recipes.importReviewImported')}: {conflict.importedName}
												</span>
												{conflict.importedId ? (
													<span>ID #{conflict.importedId}</span>
												) : (
													<span>{t('recipes.importReviewUnmatched')}</span>
												)}
											</div>
											<input
												type='text'
												value={importSearchByConflict[conflict.key] ?? ''}
												placeholder={t('recipes.importReviewSearchPlaceholder')}
												onChange={(e) => handleImportIngredientSearch(conflict.key, e.target.value)}
											/>
										</div>

										<div className='import-review-candidates'>
											{candidates.length === 0 ? (
												<div className='import-review-empty'>
													{t('recipes.importReviewNoMatches')}
												</div>
											) : (
												candidates.map((candidate) => (
													<button
														key={candidate.id}
														type='button'
														className={`btn ${chosen?.ingredientId === candidate.id ? 'btn-primary' : 'btn-outline'} btn-sm`}
														onClick={() => {
															setImportReview((prev) => {
																if (!prev) return prev
																return {
																	...prev,
																	resolutions: {
																		...prev.resolutions,
																		[conflict.key]: {
																			ingredientId: candidate.id,
																			name: candidate.name,
																		},
																	},
																}
															})
														}}
														title={candidate.name}>
														{candidate.name}
													</button>
												))
											)}
										</div>
									</article>
								)
							})}
						</div>

						<footer className='import-review-footer'>
							<button
								type='button'
								className='btn btn-primary'
								disabled={importReview.conflicts.some(
									(conflict) => !importReview.resolutions[conflict.key]
								)}
								onClick={() => void handleImportReviewConfirm()}>
								{t('recipes.importReviewConfirm')}
							</button>
						</footer>
					</div>
				</div>
			)}
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

			<AddToWeekModal
				recipe={selectedRecipe}
				isOpen={modalOpen}
				onClose={() => setModalOpen(false)}
			/>

			<PdfVariantsModal
				isOpen={multiPdfModal !== null && multiPdfModal.questions.length > 0}
				onClose={() => setMultiPdfModal(null)}
				questions={multiPdfModal?.questions ?? []}
				selections={multiPdfModal?.selections ?? {}}
				loading={multiPdfModal?.loading ?? false}
				merge={multiPdfModal?.merge ?? false}
				showMultipleRoots={(multiPdfModal?.rootIds.length ?? 0) > 1}
				modalId='multi'
				onSelectionChange={handleMultiPdfChange}
				onMergeChange={(v) => setMultiPdfModal((m) => (m ? { ...m, merge: v } : m))}
				onConfirm={confirmMultiPdfDownload}
			/>
		</>
	)
}
