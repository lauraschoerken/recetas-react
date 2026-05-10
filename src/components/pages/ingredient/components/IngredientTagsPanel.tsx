import './IngredientTagsPanel.scss'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { IngredientTag, ingredientTagService, TagAssignment } from '@/services/ingredientExtras'
import { useDialog } from '@/utils/dialog/DialogContext'

interface Props {
	ingredientId: number
}

export function IngredientTagsPanel({ ingredientId }: Props) {
	const { t } = useTranslation()
	const { toast } = useDialog()
	const [allTags, setAllTags] = useState<IngredientTag[]>([])
	const [assigned, setAssigned] = useState<TagAssignment[]>([])
	const [search, setSearch] = useState('')
	const [newTagName, setNewTagName] = useState('')
	const [newTagColor, setNewTagColor] = useState('#6c757d')
	const [creating, setCreating] = useState(false)
	const [createError, setCreateError] = useState<string | null>(null)

	useEffect(() => {
		loadData()
		// eslint-disable-line react-hooks/exhaustive-deps
	}, [ingredientId])

	const loadData = async () => {
		try {
			const [tags, assignments] = await Promise.all([
				ingredientTagService.getAll(),
				ingredientTagService.getForIngredient(ingredientId),
			])
			setAllTags(tags)
			setAssigned(assignments)
		} catch {
			// silencioso
		}
	}

	const isAssigned = (tagId: number) => assigned.some((a) => a.tagId === tagId)

	const handleToggle = async (tag: IngredientTag) => {
		try {
			if (isAssigned(tag.id)) {
				await ingredientTagService.unassign(ingredientId, tag.id)
				toast.success(t('tags.unassigned'))
			} else {
				await ingredientTagService.assign(ingredientId, tag.id)
				toast.success(t('tags.assigned'))
			}
			await loadData()
		} catch {
			toast.error(t('error'))
		}
	}

	const handleCreate = async () => {
		const name = newTagName.trim()
		if (!name) return
		setCreateError(null)
		try {
			await ingredientTagService.create({ name, color: newTagColor })
			setNewTagName('')
			setNewTagColor('#6c757d')
			setCreating(false)
			toast.success(t('tags.created'))
			await loadData()
		} catch (err: any) {
			if (err?.status === 409 || err?.httpCode === 409) {
				setCreateError(t('tags.duplicateName'))
			} else {
				toast.error(t('tags.createError'))
			}
		}
	}

	const effectiveColor = (tag: IngredientTag) => tag.colorOverride ?? tag.color

	// Tags asignados siempre visibles; el resto solo si hay búsqueda y coinciden
	const q = search.trim().toLowerCase()
	const assignedTags = allTags.filter((t) => isAssigned(t.id))
	const searchResults = q
		? allTags.filter((t) => !isAssigned(t.id) && t.name.toLowerCase().includes(q))
		: []

	return (
		<div className='ing-tags-panel'>
			{/* Tags asignados */}
			{assignedTags.length > 0 && (
				<div className='ing-tags-panel__list'>
					{assignedTags.map((tag) => (
						<button
							key={tag.id}
							className='ing-tags-panel__chip ing-tags-panel__chip--active'
							style={
								effectiveColor(tag)
									? { borderColor: effectiveColor(tag)!, background: effectiveColor(tag)! }
									: {}
							}
							onClick={() => handleToggle(tag)}>
							{tag.name}
							{tag.isGlobal && <span className='ing-tags-panel__chip-badge'>G</span>}
						</button>
					))}
				</div>
			)}

			{/* Buscador */}
			<input
				type='text'
				className='ing-tags-panel__input'
				placeholder={t('tags.searchPlaceholder')}
				value={search}
				onChange={(e) => setSearch(e.target.value)}
			/>

			{/* Resultados de búsqueda */}
			{q && (
				<div className='ing-tags-panel__list'>
					{searchResults.length === 0 ? (
						<span className='ing-tags-panel__empty'>{t('tags.noResults')}</span>
					) : (
						searchResults.map((tag) => (
							<button
								key={tag.id}
								className='ing-tags-panel__chip'
								style={effectiveColor(tag) ? { borderColor: effectiveColor(tag)! } : {}}
								onClick={() => handleToggle(tag)}>
								{tag.name}
								{tag.isGlobal && <span className='ing-tags-panel__chip-badge'>G</span>}
							</button>
						))
					)}
				</div>
			)}

			{creating ? (
				<div className='ing-tags-panel__create'>
					<input
						type='text'
						value={newTagName}
						onChange={(e) => {
							setNewTagName(e.target.value)
							setCreateError(null)
						}}
						placeholder={t('tags.name')}
						className='ing-tags-panel__input'
						autoFocus
						onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
					/>
					<input
						type='color'
						value={newTagColor}
						onChange={(e) => setNewTagColor(e.target.value)}
						className='ing-tags-panel__color-picker'
						title={t('tags.color')}
					/>
					{createError && <span className='ing-tags-panel__error'>{createError}</span>}
					<button className='ing-tags-panel__btn-create' onClick={handleCreate}>
						{t('save')}
					</button>
					<button
						className='ing-tags-panel__btn-cancel'
						onClick={() => {
							setCreating(false)
							setCreateError(null)
						}}>
						{t('cancel')}
					</button>
				</div>
			) : (
				<button className='ing-tags-panel__btn-add' onClick={() => setCreating(true)}>
					+ {t('tags.add')}
				</button>
			)}
		</div>
	)
}
