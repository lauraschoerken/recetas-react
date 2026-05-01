import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { AddToWeekModal } from '@/components/shared/modals/AddToWeekModal'
import { Pagination } from '@/components/shared/pagination/Pagination'
import { authService } from '@/services/auth'
import { Recipe, recipeService } from '@/services/recipe'
import { pdfService } from '@/services/pdf'
import { IngredientTag, ingredientTagService } from '@/services/ingredientExtras'
import { useDialog } from '@/utils/dialog/DialogContext'
import { getStoredPageSize } from '@/utils/pagination/usePagination'
import { normalizeText } from '@/utils/normalize'

import { RecipeList } from '../components/RecipeList'
import { RecipeFilters, RecipeFilterValues, DEFAULT_FILTERS } from '../components/RecipeFilters'

// ── Tipos para el modal de selección de variantes al exportar PDF ──
interface MultiPdfQuestion {
	key: string
	rootRecipeId: number
	rootTitle: string
	recipeId: number
	recipeTitle: string
	componentId: number
	componentName: string
	depth: number
	options: any[]
}

interface MultiPdfModalState {
	questions: MultiPdfQuestion[]
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
	questions: MultiPdfQuestion[]
	selections: Record<string, number>
	cache: Record<number, any>
}> {
	const cache = { ...baseCache }
	const selections = { ...baseSelections }
	const questions: MultiPdfQuestion[] = []

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
				if (!selections[key] && defaultOptId) selections[key] = defaultOptId
				questions.push({
					key,
					rootRecipeId: rootId,
					rootTitle,
					recipeId: currentId,
					recipeTitle: data.title,
					componentId: comp.id,
					componentName: comp.name,
					depth,
					options: comp.options,
				})
				const selectedOptId = selections[key] || defaultOptId
				const selectedOpt = comp.options.find((o: any) => o.id === selectedOptId)
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
	const [loading, setLoading] = useState(true)
	const [initialLoad, setInitialLoad] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
	const [modalOpen, setModalOpen] = useState(false)
	const [pageSize] = useState(getStoredPageSize)
	const [availableTags, setAvailableTags] = useState<IngredientTag[]>([])
	const [authors, setAuthors] = useState<{ id: number; name: string }[]>([])
	const currentUser = authService.getUser()

	// Selección múltiple
	const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
	const [multiPdfModal, setMultiPdfModal] = useState<MultiPdfModalState | null>(null)

	const currentPage = parseInt(searchParams.get('page') || '1', 10)
	const search = searchParams.get('q') || ''
	const [filtersOpen, setFiltersOpen] = useState(false)

	// Leer filtros desde URL
	const [filters, setFilters] = useState<RecipeFilterValues>({
		visibility: (searchParams.get('visibility') as RecipeFilterValues['visibility']) || 'all',
		minCalories: searchParams.get('minCal') || '',
		maxCalories: searchParams.get('maxCal') || '',
		minProtein: searchParams.get('minProt') || '',
		maxProtein: searchParams.get('maxProt') || '',
		minCarbs: searchParams.get('minCarbs') || '',
		maxCarbs: searchParams.get('maxCarbs') || '',
		minFat: searchParams.get('minFat') || '',
		maxFat: searchParams.get('maxFat') || '',
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
		filters.visibility !== 'all',
		filters.minCalories,
		filters.maxCalories,
		filters.minProtein,
		filters.maxProtein,
		filters.minCarbs,
		filters.maxCarbs,
		filters.minFat,
		filters.maxFat,
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
		recipeService
			.getAuthors()
			.catch(() => [])
			.then(setAuthors)
	}, [])

	const loadRecipes = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			const result = await recipeService.getAllPaginated({
				page: currentPage,
				pageSize,
				search: normalizeText(search),
				visibility: filters.visibility,
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
		const confirmed = await confirm({
			title: t('recipes.deleteTitle'),
			message: t('recipes.deleteConfirm'),
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

				setOrDel('visibility', newFilters.visibility !== 'all' ? newFilters.visibility : undefined)
				setOrDel('minCal', newFilters.minCalories || undefined)
				setOrDel('maxCal', newFilters.maxCalories || undefined)
				setOrDel('minProt', newFilters.minProtein || undefined)
				setOrDel('maxProt', newFilters.maxProtein || undefined)
				setOrDel('minCarbs', newFilters.minCarbs || undefined)
				setOrDel('maxCarbs', newFilters.maxCarbs || undefined)
				setOrDel('minFat', newFilters.minFat || undefined)
				setOrDel('maxFat', newFilters.maxFat || undefined)
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
					'visibility',
					'minCal',
					'maxCal',
					'minProt',
					'maxProt',
					'minCarbs',
					'maxCarbs',
					'minFat',
					'maxFat',
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
				// Sin variantes — descarga directa
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

	const handleMultiPdfChange = async (question: MultiPdfQuestion, value: number) => {
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
					const val = selections[key] || mpDefaultOpt(comp)
					if (val) selectedOptions[comp.id] = val
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
		} catch {
			toast.error(t('recipes.exportError'))
		}
	}

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
		const isCsv = file.name.endsWith('.csv') || file.type === 'text/csv'
		if (isCsv) {
			await handleImportCsv(file, e.target)
		} else {
			await handleImportPdf(file, e.target)
		}
	}

	if (loading && initialLoad) return <div className='loading'>{t('recipes.loading')}</div>
	if (error) return <div className='error-message'>{error}</div>

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
			return true
		})
	}

	const visibleRecipes = applyClientFilters(recipes)

	return (
		<>
			<div className='page-header'>
				<h1 className='page-title'>{t('recipes.title')}</h1>
				<div className='page-header-actions'>
					<label className='btn btn-outline' style={{ cursor: 'pointer' }}>
						{t('recipes.import')}
						<input
							type='file'
							accept='.pdf,application/pdf,.csv,text/csv'
							ref={importFileRef}
							onChange={handleImportFile}
							style={{ display: 'none' }}
						/>
					</label>
					<Link to='/recipes/new' className='btn btn-primary'>
						{t('recipes.new')}
					</Link>
				</div>
			</div>

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
					<button className='btn btn-outline btn-sm' onClick={handleExportSelectedPdf}>
						{t('recipes.exportPdfSelected')}
					</button>
					<button className='btn btn-outline btn-sm' onClick={handleExportSelectedCsv}>
						{t('recipes.exportCsv')}
					</button>
					<button className='btn btn-outline btn-sm' onClick={() => setSelectedIds(new Set())}>
						{t('recipes.deselectAll')}
					</button>
				</div>
			)}

			<div className='search-bar-container'>
				<input
					type='search'
					className='form-input'
					placeholder={t('search')}
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

			{filtersOpen && (
				<RecipeFilters
					filters={filters}
					availableTags={availableTags}
					authors={authors}
					onChange={handleFiltersChange}
					onClear={handleFiltersClear}
					activeCount={activeFilterCount}
				/>
			)}

			<RecipeList
				recipes={visibleRecipes}
				currentUserId={currentUser?.id || 0}
				onDelete={handleDelete}
				onAddToWeek={handleAddToWeek}
				selectedIds={selectedIds}
				onToggleSelect={handleToggleSelect}
			/>

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

			{multiPdfModal && (
				<div className='modal-overlay' onClick={() => setMultiPdfModal(null)}>
					<div className='modal-content recipe-card-pdf-modal' onClick={(e) => e.stopPropagation()}>
						<div className='recipe-card-pdf-header'>
							<h3 className='recipe-card-pdf-title'>{t('recipes.pdfSelectVariants')}</h3>
							<p className='recipe-card-pdf-hint'>{t('recipes.pdfSelectVariantsHint')}</p>
						</div>
						{multiPdfModal.loading && <p className='recipe-card-pdf-hint'>{t('loading')}</p>}
						{multiPdfModal.questions.map((q) => (
							<div
								key={q.key}
								className='recipe-card-pdf-group'
								style={{ marginLeft: `${q.depth * 14}px` }}>
								<label className='recipe-card-pdf-label'>
									{multiPdfModal.rootIds.length > 1 && (
										<span className='pdf-nested-prefix'>{q.rootTitle} › </span>
									)}
									{q.depth > 0 && <span className='pdf-nested-prefix'>{q.recipeTitle} - </span>}
									{q.componentName}
								</label>
								<select
									className='form-input'
									value={multiPdfModal.selections[q.key] || ''}
									onChange={(e) => handleMultiPdfChange(q, parseInt(e.target.value))}
									disabled={multiPdfModal.loading}>
									{q.options.map((opt: any) => (
										<option key={opt.id} value={opt.id}>
											{opt.recipeId || opt.recipe ? '📖' : '🥬'}{' '}
											{opt.name || opt.recipe?.title || opt.ingredient?.name}
											{opt.isDefault ? ` (${t('default')})` : ''}
										</option>
									))}
								</select>
							</div>
						))}
						<div className='recipe-card-pdf-actions'>
							{multiPdfModal.questions.some((q) => q.depth > 0) && (
								<div className='pdf-merge-row'>
									<span className='recipe-card-pdf-label'>{t('recipes.pdfMode')}</span>
									<label className='pdf-radio-label'>
										<input
											type='radio'
											checked={!multiPdfModal.merge}
											onChange={() => setMultiPdfModal((m) => (m ? { ...m, merge: false } : m))}
										/>
										{t('recipes.pdfModeMultiple')}
									</label>
									<label className='pdf-radio-label'>
										<input
											type='radio'
											checked={multiPdfModal.merge}
											onChange={() => setMultiPdfModal((m) => (m ? { ...m, merge: true } : m))}
										/>
										{t('recipes.pdfModeSingle')}
									</label>
								</div>
							)}
							<div className='flex gap-1'>
								<button className='btn btn-outline' onClick={() => setMultiPdfModal(null)}>
									{t('cancel')}
								</button>
								<button
									className='btn btn-primary'
									onClick={confirmMultiPdfDownload}
									disabled={multiPdfModal.loading}>
									{t('recipes.downloadPdf')}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</>
	)
}
