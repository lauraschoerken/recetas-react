import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { AddToWeekModal } from '@/components/shared/modals/AddToWeekModal'
import { Pagination } from '@/components/shared/pagination/Pagination'
import { authService } from '@/services/auth'
import { Recipe, recipeService } from '@/services/recipe'
import { pdfService } from '@/services/pdf'
import { useDialog } from '@/utils/dialog/DialogContext'
import { getStoredPageSize } from '@/utils/pagination/usePagination'

import { RecipeList } from '../components/RecipeList'

export function RecipeListContainer() {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const [searchParams, setSearchParams] = useSearchParams()
	const { confirm, toast } = useDialog()
	const [recipes, setRecipes] = useState<Recipe[]>([])
	const [total, setTotal] = useState(0)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
	const [modalOpen, setModalOpen] = useState(false)
	const [pageSize] = useState(getStoredPageSize)
	const currentUser = authService.getUser()

	const currentPage = parseInt(searchParams.get('page') || '1', 10)
	const search = searchParams.get('q') || ''

	const loadRecipes = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			const result = await recipeService.getAllPaginated({ page: currentPage, pageSize, search })
			setRecipes(result.data)
			setTotal(result.total)
		} catch {
			setError(t('recipes.loadError'))
		} finally {
			setLoading(false)
		}
	}, [currentPage, pageSize, search, t])

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

	if (loading) return <div className='loading'>{t('recipes.loading')}</div>
	if (error) return <div className='error-message'>{error}</div>

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
			</div>

			<RecipeList
				recipes={recipes}
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
