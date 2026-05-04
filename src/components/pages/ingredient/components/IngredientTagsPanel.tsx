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

	const handleToggleHideGlobal = async (tag: IngredientTag) => {
		try {
			await ingredientTagService.saveUserPreference(tag.id, {
				isHiddenGlobally: !tag.isHiddenGlobally,
			})
			toast.success(tag.isHiddenGlobally ? t('tags.unhidden') : t('tags.hidden'))
			await loadData()
		} catch {
			toast.error(t('error'))
		}
	}

	const handleColorOverride = async (tag: IngredientTag, color: string) => {
		try {
			await ingredientTagService.saveUserPreference(tag.id, { colorOverride: color })
			await loadData()
		} catch {
			toast.error(t('error'))
		}
	}

	const effectiveColor = (tag: IngredientTag) => tag.colorOverride ?? tag.color

	return (
		<div className='ing-tags-panel'>
			<div className='ing-tags-panel__list'>
				{allTags.length === 0 ? (
					<span className='ing-tags-panel__empty'>{t('tags.noTags')}</span>
				) : (
					allTags.map((tag) => (
						<div key={tag.id} className='ing-tags-panel__chip-row'>
							<button
								className={`ing-tags-panel__chip${isAssigned(tag.id) ? ' ing-tags-panel__chip--active' : ''}${tag.isHiddenGlobally ? ' ing-tags-panel__chip--hidden' : ''}`}
								style={
									effectiveColor(tag)
										? {
												borderColor: effectiveColor(tag)!,
												...(isAssigned(tag.id) ? { background: effectiveColor(tag)! } : {}),
											}
										: {}
								}
								onClick={() => handleToggle(tag)}
								title={tag.isGlobal ? t('tags.tagLabel') : ''}>
								{tag.name}
								{tag.isGlobal && <span className='ing-tags-panel__chip-badge'>G</span>}
							</button>
							{/* Para tags globales: botón ocultar + color override */}
							{tag.isGlobal && (
								<>
									<button
										className='ing-tags-panel__btn-icon'
										title={tag.isHiddenGlobally ? t('tags.unhideGlobally') : t('tags.hideGlobally')}
										onClick={() => handleToggleHideGlobal(tag)}>
										{tag.isHiddenGlobally ? '👁' : '🚫'}
									</button>
									<input
										type='color'
										className='ing-tags-panel__color-mini'
										value={tag.colorOverride ?? tag.color ?? '#6c757d'}
										title={t('tags.colorOverride')}
										onChange={(e) => handleColorOverride(tag, e.target.value)}
									/>
								</>
							)}
						</div>
					))
				)}
			</div>
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
