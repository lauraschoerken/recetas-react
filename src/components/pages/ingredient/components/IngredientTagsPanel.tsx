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
	const [newTagName, setNewTagName] = useState('')
	const [creating, setCreating] = useState(false)

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
		try {
			await ingredientTagService.create({ name })
			setNewTagName('')
			setCreating(false)
			toast.success(t('tags.created'))
			await loadData()
		} catch {
			toast.error(t('tags.createError'))
		}
	}

	return (
		<div className='ing-tags-panel'>
			<div className='ing-tags-panel__list'>
				{allTags.length === 0 ? (
					<span className='ing-tags-panel__empty'>{t('tags.noTags')}</span>
				) : (
					allTags.map((tag) => (
						<button
							key={tag.id}
							className={`ing-tags-panel__chip${isAssigned(tag.id) ? ' ing-tags-panel__chip--active' : ''}`}
							style={
								tag.color
									? {
											borderColor: tag.color,
											...(isAssigned(tag.id) ? { background: tag.color } : {}),
										}
									: {}
							}
							onClick={() => handleToggle(tag)}
							title={tag.isGlobal ? t('tags.tagLabel') : ''}>
							{tag.name}
							{tag.isGlobal && <span className='ing-tags-panel__chip-badge'>G</span>}
						</button>
					))
				)}
			</div>
			{creating ? (
				<div className='ing-tags-panel__create'>
					<input
						type='text'
						value={newTagName}
						onChange={(e) => setNewTagName(e.target.value)}
						placeholder={t('tags.name')}
						className='ing-tags-panel__input'
						autoFocus
						onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
					/>
					<button className='ing-tags-panel__btn-create' onClick={handleCreate}>
						{t('save')}
					</button>
					<button className='ing-tags-panel__btn-cancel' onClick={() => setCreating(false)}>
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
