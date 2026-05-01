import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { alertService } from '@/services/alert'
import { authService } from '@/services/auth'
import { CreateRecipeData, Recipe, recipeService } from '@/services/recipe'
import { useDialog } from '@/utils/dialog/DialogContext'

import { RecipeForm } from '../components/RecipeForm'

export function RecipeFormContainer() {
	const { t } = useTranslation()
	const { id } = useParams<{ id: string }>()
	const navigate = useNavigate()
	const { toast } = useDialog()
	const [recipe, setRecipe] = useState<Recipe | null>(null)
	const [loading, setLoading] = useState(false)
	const [initialLoading, setInitialLoading] = useState(!!id)
	const [error, setError] = useState<string | null>(null)
	const [minServings, setMinServings] = useState('')
	const [hasThreshold, setHasThreshold] = useState(false)

	const isEditing = !!id

	useEffect(() => {
		if (id) {
			loadRecipe()
			alertService
				.getRecipeThresholds()
				.then((thresholds) => {
					const match = thresholds.find((thr) => thr.recipeId === parseInt(id))
					if (match) {
						setMinServings(match.minServings.toString())
						setHasThreshold(true)
					}
				})
				.catch(() => {})
		}
	}, [id])

	const loadRecipe = async () => {
		try {
			const data = await recipeService.getById(parseInt(id!))
			const currentUser = authService.getUser()
			if (currentUser && data.userId !== currentUser.id) {
				navigate(`/recipes/${id}`, { replace: true })
				return
			}
			setRecipe(data)
		} catch {
			setError(t('recipes.notFound'))
		} finally {
			setInitialLoading(false)
		}
	}

	const handleSaveThreshold = async () => {
		const min = Number(minServings)
		if (!min || min <= 0 || !id) return
		try {
			await alertService.setRecipeThreshold({ recipeId: parseInt(id), minServings: min })
			setHasThreshold(true)
			toast.success(t('recipes.thresholdSaved'))
		} catch {
			toast.error(t('recipes.thresholdSaveError'))
		}
	}

	const handleDeleteThreshold = async () => {
		if (!id) return
		try {
			await alertService.deleteRecipeThreshold(parseInt(id))
			setMinServings('')
			setHasThreshold(false)
			toast.success(t('recipes.thresholdRemoved'))
		} catch {
			toast.error(t('recipes.thresholdSaveError'))
		}
	}

	const handleSubmit = async (data: CreateRecipeData) => {
		setError(null)
		setLoading(true)

		try {
			if (isEditing && id) {
				await recipeService.update(parseInt(id), data)
				toast.success(t('recipes.updated'))
			} else {
				await recipeService.create(data)
				toast.success(t('recipes.created'))
			}
			navigate('/recipes')
		} catch (err) {
			setError(err instanceof Error ? err.message : t('recipes.saveError'))
		} finally {
			setLoading(false)
		}
	}

	const handleCancel = () => {
		navigate(-1)
	}

	if (initialLoading) {
		return <div className='loading'>{t('recipes.loading')}</div>
	}

	return (
		<>
			<div className='page-header'>
				<h1 className='page-title'>{isEditing ? t('recipes.editTitle') : t('recipes.newTitle')}</h1>
			</div>

			<div className='card'>
				<RecipeForm
					initialData={recipe || undefined}
					onSubmit={handleSubmit}
					onCancel={handleCancel}
					loading={loading}
					error={error}
					thresholdConfig={
						isEditing
							? {
									minServings,
									hasThreshold,
									onChange: setMinServings,
									onSave: handleSaveThreshold,
									onDelete: handleDeleteThreshold,
								}
							: undefined
					}
				/>
			</div>
		</>
	)
}
