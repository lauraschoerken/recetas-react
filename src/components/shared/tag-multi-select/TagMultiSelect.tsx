import './TagMultiSelect.scss'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface TagOption {
	id: number
	name: string
	color?: string | null
}

interface TagMultiSelectProps {
	tags: TagOption[]
	/** IDs marcados como "incluir" (fondo coloreado, ✓) */
	includedIds: number[]
	/** IDs marcados como "excluir" (fondo rojo, ✕). Si undefined → modo 2 estados. */
	excludedIds?: number[]
	onChange: (includedIds: number[], excludedIds: number[]) => void
	searchPlaceholder?: string
}

export function TagMultiSelect({
	tags,
	includedIds,
	excludedIds,
	onChange,
	searchPlaceholder,
}: TagMultiSelectProps) {
	const { t } = useTranslation()
	const [search, setSearch] = useState('')
	const triState = excludedIds !== undefined

	const lower = search.toLowerCase()
	const filtered = search ? tags.filter((tag) => tag.name.toLowerCase().includes(lower)) : tags

	const selectedSet = new Set([...includedIds, ...(excludedIds ?? [])])
	const selectedTags = tags.filter((tag) => selectedSet.has(tag.id))
	const unselectedFiltered = filtered.filter((tag) => !selectedSet.has(tag.id))

	const handleClick = (tagId: number) => {
		const inInclude = includedIds.includes(tagId)
		const inExclude = (excludedIds ?? []).includes(tagId)

		if (triState) {
			if (!inInclude && !inExclude) {
				// neutral → incluir
				onChange([...includedIds, tagId], excludedIds!)
			} else if (inInclude) {
				// incluir → excluir
				onChange(
					includedIds.filter((id) => id !== tagId),
					[...excludedIds!, tagId]
				)
			} else {
				// excluir → neutral
				onChange(
					includedIds,
					excludedIds!.filter((id) => id !== tagId)
				)
			}
		} else {
			if (inInclude) {
				onChange(
					includedIds.filter((id) => id !== tagId),
					[]
				)
			} else {
				onChange([...includedIds, tagId], [])
			}
		}
	}

	return (
		<div className='tag-ms'>
			{/* Búsqueda */}
			<div className='tag-ms__search-wrap'>
				<svg
					className='tag-ms__search-icon'
					viewBox='0 0 20 20'
					fill='currentColor'
					aria-hidden='true'>
					<path
						fillRule='evenodd'
						d='M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z'
						clipRule='evenodd'
					/>
				</svg>
				<input
					type='text'
					className='tag-ms__input'
					placeholder={searchPlaceholder ?? t('tags.searchPlaceholder')}
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>
				{search && (
					<button type='button' className='tag-ms__clear-search' onClick={() => setSearch('')}>
						×
					</button>
				)}
			</div>

			{/* Pills */}
			<div className='tag-ms__pills'>
				{/* Tags seleccionados (siempre visibles aunque no coincidan con la búsqueda) */}
				{selectedTags.map((tag) => {
					const isIncluded = includedIds.includes(tag.id)
					const cls = `tag-ms__pill ${isIncluded ? 'tag-ms__pill--include' : 'tag-ms__pill--exclude'}`
					const title = triState
						? isIncluded
							? t('tags.clickToExclude')
							: t('tags.clickToRemove')
						: undefined
					return (
						<button
							key={tag.id}
							type='button'
							className={cls}
							style={
								isIncluded && tag.color
									? ({ '--tag-color': tag.color } as React.CSSProperties)
									: undefined
							}
							title={title}
							onClick={() => handleClick(tag.id)}>
							<span className='tag-ms__pill-icon' aria-hidden='true'>
								{isIncluded ? '✓' : '✕'}
							</span>
							{tag.name}
						</button>
					)
				})}

				{selectedTags.length > 0 && unselectedFiltered.length > 0 && (
					<div className='tag-ms__sep' role='separator' />
				)}

				{/* Tags sin seleccionar, filtrados por búsqueda */}
				{unselectedFiltered.map((tag) => (
					<button
						key={tag.id}
						type='button'
						className='tag-ms__pill'
						style={tag.color ? ({ '--tag-color': tag.color } as React.CSSProperties) : undefined}
						onClick={() => handleClick(tag.id)}>
						{tag.name}
					</button>
				))}

				{filtered.length === 0 && search && (
					<span className='tag-ms__empty'>{t('tags.noResults')}</span>
				)}
			</div>
		</div>
	)
}
