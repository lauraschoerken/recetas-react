import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { IngredientFormModal } from '@/components/pages/ingredient/containers/IngredientFormModal'
import { Pagination } from '@/components/shared/pagination/Pagination'
import { RecipeJsonTextModal } from '@/components/shared/recipe-import-modal/RecipeJsonTextModal'
import {
	adminService,
	AuditedIngredient,
	IngredientAuditIssue,
	IngredientImportPreview,
} from '@/services/admin'
import { useDialog } from '@/utils/dialog/DialogContext'

const issueKeys: IngredientAuditIssue[] = [
	'UNREVIEWED',
	'MISSING_MACROS',
	'MISSING_IMAGE',
	'POSSIBLE_DUPLICATE',
]

const errorMessage = (error: unknown, fallback: string) =>
	error instanceof Error ? error.message : fallback

export function IngredientAuditPanel() {
	const { t } = useTranslation()
	const { toast, confirm } = useDialog()
	const [items, setItems] = useState<AuditedIngredient[]>([])
	const [loading, setLoading] = useState(true)
	const [searchInput, setSearchInput] = useState('')
	const [search, setSearch] = useState('')
	const [issue, setIssue] = useState<IngredientAuditIssue | 'ALL'>('ALL')
	const [currentPage, setCurrentPage] = useState(1)
	const [pageSize, setPageSize] = useState(30)
	const [total, setTotal] = useState(0)
	const [summary, setSummary] = useState<Record<IngredientAuditIssue, number>>({
		UNREVIEWED: 0,
		MISSING_MACROS: 0,
		MISSING_IMAGE: 0,
		POSSIBLE_DUPLICATE: 0,
	})
	const [selected, setSelected] = useState<Set<number>>(new Set())
	const [editing, setEditing] = useState<AuditedIngredient | null>(null)
	const [busy, setBusy] = useState(false)
	const [importReview, setImportReview] = useState<{
		payload: unknown
		preview: IngredientImportPreview
	} | null>(null)
	const [showJsonText, setShowJsonText] = useState(false)
	const [jsonText, setJsonText] = useState('')
	const [jsonTextError, setJsonTextError] = useState('')

	const load = async () => {
		setLoading(true)
		try {
			const result = await adminService.getIngredientAudit({
				page: currentPage,
				pageSize,
				search: search || undefined,
				issue,
			})
			setItems(result.data)
			setTotal(result.total)
			setSummary(result.summary)
			if (result.data.length === 0 && result.total > 0 && currentPage > 1) {
				setCurrentPage((page) => page - 1)
			}
		} catch {
			toast.error(t('admin.audit.loadError'))
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		void load()
	}, [currentPage, pageSize, search, issue])

	const toggle = (id: number) => {
		setSelected((current) => {
			const next = new Set(current)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}

	const toggleAll = () => {
		const visibleIds = items.map((item) => item.id)
		const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))
		setSelected((current) => {
			const next = new Set(current)
			visibleIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)))
			return next
		})
	}

	const exportSelected = async () => {
		if (!selected.size) return
		setBusy(true)
		try {
			const payload = await adminService.exportIngredients([...selected])
			const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
			const url = URL.createObjectURL(blob)
			const link = document.createElement('a')
			link.href = url
			link.download = `auditoria-ingredientes-${new Date().toISOString().slice(0, 10)}.json`
			link.click()
			URL.revokeObjectURL(url)
		} catch (error: unknown) {
			toast.error(errorMessage(error, t('admin.audit.exportError')))
		} finally {
			setBusy(false)
		}
	}

	const reviewImportPayload = async (payload: unknown) => {
		setBusy(true)
		try {
			const preview = await adminService.validateIngredientImport(payload)
			setImportReview({ payload, preview })
			setShowJsonText(false)
			setJsonTextError('')
		} finally {
			setBusy(false)
		}
	}

	const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		event.target.value = ''
		if (!file) return
		try {
			await reviewImportPayload(JSON.parse(await file.text()))
		} catch (error: unknown) {
			toast.error(errorMessage(error, t('admin.audit.importError')))
		}
	}

	const importJsonText = async () => {
		setJsonTextError('')
		try {
			await reviewImportPayload(JSON.parse(jsonText))
		} catch (error: unknown) {
			setJsonTextError(errorMessage(error, t('admin.audit.importError')))
		}
	}

	const applyImport = async () => {
		if (!importReview) return
		setBusy(true)
		try {
			const result = await adminService.importIngredients(importReview.payload)
			toast.success(t('admin.audit.imported', { count: result.updated }))
			setImportReview(null)
			setSelected(new Set())
			await load()
		} catch (error: unknown) {
			toast.error(errorMessage(error, t('admin.audit.importError')))
		} finally {
			setBusy(false)
		}
	}

	const displayValue = (value: unknown) => {
		if (value === null || value === undefined || value === '') return t('admin.audit.emptyValue')
		if (typeof value === 'boolean') return value ? t('yes') : t('no')
		if (typeof value === 'object') return JSON.stringify(value)
		return String(value)
	}

	const changeLabel = (path: string) => {
		const segments = path.split('.')
		if (segments[0] === 'tags') return segments[1].startsWith('new') ? t('admin.audit.newTag') : t('admin.audit.assignTag')
		if (segments[0] === 'variants' && segments[1].startsWith('new')) return t('admin.audit.newVariant')
		if (segments[0] === 'conversions' && segments[1].startsWith('new')) return t('admin.audit.newConversion')
		if (segments[0] === 'variants') return `${t('admin.audit.variant')} #${segments[1]} · ${t(`admin.audit.fields.${segments[2]}`, segments[2])}`
		if (segments[0] === 'conversions') return `${t('admin.audit.conversion')} #${segments[1]} · ${t(`admin.audit.fields.${segments[2]}`, segments[2])}`
		return t(`admin.audit.fields.${path}`, path)
	}

	const markReviewed = async (item: AuditedIngredient) => {
		try {
			await adminService.markIngredientReviewed(item.id)
			toast.success(t('admin.audit.reviewed'))
			await load()
		} catch (error: unknown) {
			toast.error(errorMessage(error, t('admin.reviewError')))
		}
	}

	const merge = async (
		source: AuditedIngredient,
		target: Pick<AuditedIngredient, 'id' | 'name' | 'variants' | 'conversions'>
	) => {
		const preservedVariants = source.variants.filter((variant) => {
			const match = target.variants.find((candidate) => candidate.name.toLocaleLowerCase() === variant.name.toLocaleLowerCase())
			return match && ['calories', 'protein', 'carbs', 'fat', 'fiber', 'weightFactor'].some(
				(field) => match[field as keyof typeof match] !== variant[field as keyof typeof variant]
			)
		}).length
		const preservedConversions = source.conversions.filter((conversion) => {
			const match = target.conversions.find((candidate) => candidate.unitName.toLocaleLowerCase() === conversion.unitName.toLocaleLowerCase())
			return match && match.gramsPerUnit !== conversion.gramsPerUnit
		}).length
		const accepted = await confirm({
			title: t('admin.audit.mergeTitle'),
			message: t('admin.audit.mergeConfirm', {
				source: source.name,
				target: target.name,
				uses: source.usage.total,
				variants: preservedVariants,
				conversions: preservedConversions,
			}),
		})
		if (!accepted) return
		setBusy(true)
		try {
			await adminService.mergeIngredients(target.id, [source.id])
			toast.success(t('admin.audit.merged'))
			setSelected((current) => {
				const next = new Set(current)
				next.delete(source.id)
				return next
			})
			await load()
		} catch (error: unknown) {
			toast.error(errorMessage(error, t('admin.audit.mergeError')))
		} finally {
			setBusy(false)
		}
	}

	if (loading) return <p className='admin-container__loading'>{t('loading')}</p>

	return (
		<div className='admin-container__section admin-audit'>
			<div className='admin-audit__summary'>
				{issueKeys.map((key) => (
					<button key={key} className='admin-audit__metric' onClick={() => { setIssue(key); setCurrentPage(1) }}>
						<strong>{summary[key]}</strong>
						<span>{t(`admin.audit.issues.${key}`)}</span>
					</button>
				))}
			</div>

			<div className='admin-audit__toolbar'>
				<input
					className='form-input'
					value={searchInput}
					onChange={(event) => setSearchInput(event.target.value)}
					onKeyDown={(event) => { if (event.key === 'Enter') { setSearch(searchInput.trim()); setCurrentPage(1) } }}
					placeholder={t('admin.audit.search')}
				/>
				<button className='btn btn--secondary' onClick={() => { setSearch(searchInput.trim()); setCurrentPage(1) }}>{t('search')}</button>
				<select className='form-input' value={issue} onChange={(event) => { setIssue(event.target.value as IngredientAuditIssue | 'ALL'); setCurrentPage(1) }}>
					<option value='ALL'>{t('admin.audit.all')}</option>
					{issueKeys.map((key) => <option key={key} value={key}>{t(`admin.audit.issues.${key}`)}</option>)}
				</select>
				<select className='form-input admin-audit__page-size' value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setCurrentPage(1) }} aria-label={t('admin.audit.pageSize')}>
					{[20, 30, 50, 100].map((size) => <option key={size} value={size}>{t('admin.audit.perPage', { count: size })}</option>)}
				</select>
				<button className='btn btn--secondary' disabled={!selected.size || busy} onClick={exportSelected}>{t('admin.audit.export', { count: selected.size })}</button>
				<label className={`btn btn--primary${busy ? ' btn--disabled' : ''}`}>
					{t('admin.audit.importFile')}
					<input type='file' accept='.json,application/json' hidden disabled={busy} onChange={importFile} />
				</label>
				<button className='btn btn--primary' disabled={busy} onClick={() => setShowJsonText(true)}>{t('admin.audit.importText')}</button>
			</div>

			<p className='admin-container__desc'>{t('admin.audit.desc')}</p>
			<div className='admin-audit__table-wrap'>
				<table className='admin-container__table admin-audit__table'>
					<thead><tr>
						<th><input type='checkbox' checked={items.length > 0 && items.every((item) => selected.has(item.id))} onChange={toggleAll} /></th>
						<th>{t('admin.ingredient')}</th><th>{t('admin.audit.problems')}</th><th>{t('admin.audit.usage')}</th><th>{t('admin.audit.created')}</th><th></th>
					</tr></thead>
					<tbody>
						{items.map((item) => (
							<tr key={item.id}>
								<td><input type='checkbox' checked={selected.has(item.id)} onChange={() => toggle(item.id)} /></td>
								<td><strong>{item.name}</strong><small>#{item.id} · {item.unit}</small></td>
								<td><div className='admin-audit__issues'>{item.issues.map((value) => <span key={value} className={`admin-container__pill admin-audit__issue admin-audit__issue--${value.toLowerCase()}`}>{t(`admin.audit.issues.${value}`)}</span>)}</div>
					{item.duplicateCandidates.map((candidate) => <button key={candidate.id} className='admin-audit__merge' disabled={busy} onClick={() => void merge(item, candidate)}>{t('admin.audit.mergeInto', { name: candidate.name, score: Math.round(candidate.score * 100) })}</button>)}</td>
								<td title={t('admin.audit.usageDetail', item.usage)}><strong>{item.usage.total}</strong><small>{t('admin.audit.references')}</small></td>
								<td>{new Date(item.createdAt).toLocaleDateString()}<small>{item.reviewedAt ? t('admin.audit.reviewedDate', { date: new Date(item.reviewedAt).toLocaleDateString() }) : t('admin.audit.notReviewed')}</small></td>
								<td className='admin-container__actions'><button className='btn btn--secondary btn--sm' onClick={() => setEditing(item)}>{t('edit')}</button>{!item.reviewedAt && <button className='btn btn--primary btn--sm' onClick={() => markReviewed(item)}>{t('admin.audit.markReviewed')}</button>}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<Pagination currentPage={currentPage} total={total} pageSize={pageSize} onPageChange={setCurrentPage} />

			<IngredientFormModal
				isOpen={!!editing}
				onClose={() => setEditing(null)}
				onSaved={() => { setEditing(null); void load() }}
				autoSaveOnClose
				ingredient={editing ? { ...editing, conversions: editing.conversions.map((conversion) => ({ ...conversion, ingredientId: editing.id })) } : null}
			/>

			{importReview && (
				<div className='modal-overlay admin-audit-review' onClick={() => !busy && setImportReview(null)}>
					<div className='modal-card admin-audit-review__modal' onClick={(event) => event.stopPropagation()}>
						<div className='admin-audit-review__header'>
							<div>
								<h2>{t('admin.audit.importOverviewTitle')}</h2>
								<p>{t('admin.audit.importOverviewDesc')}</p>
							</div>
							<button className='btn btn--secondary btn--sm' disabled={busy} onClick={() => setImportReview(null)}>×</button>
						</div>

						<div className='admin-audit-review__overview'>
							<div><strong>{importReview.preview.overview.received}</strong><span>{t('admin.audit.received')}</span></div>
							<div><strong>{importReview.preview.overview.changed}</strong><span>{t('admin.audit.changed')}</span></div>
							<div><strong>{importReview.preview.overview.unchanged}</strong><span>{t('admin.audit.unchanged')}</span></div>
							<div><strong>{importReview.preview.overview.totalChanges}</strong><span>{t('admin.audit.totalChanges')}</span></div>
							<div className={importReview.preview.overview.structuralChanges ? 'is-warning' : ''}><strong>{importReview.preview.overview.structuralChanges}</strong><span>{t('admin.audit.structuralChanges')}</span></div>
							<div><strong>{importReview.preview.overview.impactedReferences}</strong><span>{t('admin.audit.impactedReferences')}</span></div>
						</div>

						{importReview.preview.overview.changed === 0 ? (
							<p className='admin-container__empty'>{t('admin.audit.noImportChanges')}</p>
						) : (
							<div className='admin-audit-review__ingredients'>
								{importReview.preview.ingredients.filter((ingredient) => ingredient.changes.length > 0).map((ingredient) => (
									<details key={ingredient.id} open={importReview.preview.overview.changed <= 5}>
										<summary>
											<strong>{ingredient.name}</strong>
											<span>#{ingredient.id} · {t('admin.audit.changeCount', { count: ingredient.changes.length })} · {t('admin.audit.usageCount', { count: ingredient.usageTotal })}</span>
										</summary>
										<div className='admin-audit-review__changes'>
											{ingredient.changes.map((change) => (
												<div key={change.path} className={`admin-audit-review__change${change.risk === 'structural' ? ' is-structural' : ''}`}>
													<strong>{changeLabel(change.path)}</strong>
													<div><span className='before'>{displayValue(change.before)}</span><span aria-hidden='true'>→</span><span className='after'>{displayValue(change.after)}</span></div>
													{change.impactedReferences > 0 && <small>{t('admin.audit.affectsReferences', { count: change.impactedReferences })}</small>}
												</div>
											))}
							{(ingredient.omittedPreserved.variants.length > 0 || ingredient.omittedPreserved.conversions.length > 0 || ingredient.omittedPreserved.tags.length > 0) && (
												<p className='admin-audit-review__preserved'>{t('admin.audit.omittedPreserved', {
													variants: ingredient.omittedPreserved.variants.join(', ') || '—',
													conversions: ingredient.omittedPreserved.conversions.join(', ') || '—',
									tags: ingredient.omittedPreserved.tags.join(', ') || '—',
												})}</p>
											)}
										</div>
									</details>
								))}
							</div>
						)}

						<div className='admin-audit-review__actions'>
							<button className='btn btn--secondary' disabled={busy} onClick={() => setImportReview(null)}>{t('cancel')}</button>
							<button className='btn btn--primary' disabled={busy || importReview.preview.overview.changed === 0} onClick={() => void applyImport()}>{busy ? t('loading') : t('admin.audit.applyImport')}</button>
						</div>
					</div>
				</div>
			)}

			<RecipeJsonTextModal
				isOpen={showJsonText}
				value={jsonText}
				error={jsonTextError}
				onChange={setJsonText}
				onClose={() => { if (!busy) { setShowJsonText(false); setJsonTextError('') } }}
				onSubmit={() => void importJsonText()}
				title={t('admin.audit.importTextTitle')}
				placeholder={t('admin.audit.importTextPlaceholder')}
				actionLabel={busy ? t('loading') : t('admin.audit.reviewImport')}
			/>
		</div>
	)
}
