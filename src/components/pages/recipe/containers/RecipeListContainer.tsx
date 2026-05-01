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

import { RecipeList } from '../components/RecipeList'
import { RecipeFilters, RecipeFilterValues, DEFAULT_FILTERS } from '../components/RecipeFilters'

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
	const currentUser = authService.getUser()

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
	].filter(Boolean).length

	// Cargar tags disponibles
	useEffect(() => {
		ingredientTagService
			.getAll()
			.catch(() => [])
			.then(setAvailableTags)
	}, [])

	const loadRecipes = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			const result = await recipeService.getAllPaginated({
				page: currentPage,
				pageSize,
				search,
				visibility: filters.visibility,
				ingredient: filters.ingredient,
				difficulty: filters.difficulty || undefined,
				minCookTime: filters.minCookTime ? Number(filters.minCookTime) : undefined,
				maxCookTime: filters.maxCookTime ? Number(filters.maxCookTime) : undefined,
				tagIds: filters.tagIds,
				excludeTagIds: filters.excludeTagIds,
				sortBy: filters.sortBy,
				sortOrder: filters.sortOrder,
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

	const handleImportPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return
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
			e.target.value = ''
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
							accept='.pdf,application/pdf'
							ref={importFileRef}
							onChange={handleImportPdf}
							style={{ display: 'none' }}
						/>
					</label>
					<Link to='/recipes/new' className='btn btn-primary'>
						{t('recipes.new')}
					</Link>
				</div>
			</div>

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
		</>
	)
}
