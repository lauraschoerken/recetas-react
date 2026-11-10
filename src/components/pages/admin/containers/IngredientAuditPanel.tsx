import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { IngredientFormModal } from '@/components/pages/ingredient/containers/IngredientFormModal'
import {
	adminService,
	AuditedIngredient,
	IngredientAuditIssue,
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
	const [search, setSearch] = useState('')
	const [issue, setIssue] = useState<IngredientAuditIssue | 'ALL'>('ALL')
	const [selected, setSelected] = useState<Set<number>>(new Set())
	const [editing, setEditing] = useState<AuditedIngredient | null>(null)
	const [busy, setBusy] = useState(false)

	const load = async () => {
		setLoading(true)
		try {
			setItems(await adminService.getIngredientAudit())
		} catch {
			toast.error(t('admin.audit.loadError'))
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		void load()
	}, [])

	const filtered = useMemo(() => {
		const normalized = search.trim().toLocaleLowerCase()
		return items.filter(
			(item) =>
				(issue === 'ALL' || item.issues.includes(issue)) &&
				(!normalized || item.name.toLocaleLowerCase().includes(normalized) || String(item.id) === normalized)
		)
	}, [items, issue, search])

	const toggle = (id: number) => {
		setSelected((current) => {
			const next = new Set(current)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}

	const toggleAll = () => {
		const visibleIds = filtered.map((item) => item.id)
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

	const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		event.target.value = ''
		if (!file) return
		setBusy(true)
		try {
			const payload = JSON.parse(await file.text())
			const validation = await adminService.validateIngredientImport(payload)
			const accepted = await confirm({
				title: t('admin.audit.importTitle'),
				message: t('admin.audit.importConfirm', { count: validation.updated }),
			})
			if (!accepted) return
			const result = await adminService.importIngredients(payload)
			toast.success(t('admin.audit.imported', { count: result.updated }))
			setSelected(new Set())
			await load()
		} catch (error: unknown) {
			toast.error(errorMessage(error, t('admin.audit.importError')))
		} finally {
			setBusy(false)
		}
	}

	const markReviewed = async (item: AuditedIngredient) => {
		try {
			await adminService.markIngredientReviewed(item.id)
			setItems((current) =>
				current.map((candidate) =>
					candidate.id === item.id
						? { ...candidate, reviewedAt: new Date().toISOString(), issues: candidate.issues.filter((value) => value !== 'UNREVIEWED') }
						: candidate
				)
			)
			toast.success(t('admin.audit.reviewed'))
		} catch (error: unknown) {
			toast.error(errorMessage(error, t('admin.reviewError')))
		}
	}

	const merge = async (source: AuditedIngredient, target: { id: number; name: string }) => {
		const accepted = await confirm({
			title: t('admin.audit.mergeTitle'),
			message: t('admin.audit.mergeConfirm', {
				source: source.name,
				target: target.name,
				uses: source.usage.total,
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
					<button key={key} className='admin-audit__metric' onClick={() => setIssue(key)}>
						<strong>{items.filter((item) => item.issues.includes(key)).length}</strong>
						<span>{t(`admin.audit.issues.${key}`)}</span>
					</button>
				))}
			</div>

			<div className='admin-audit__toolbar'>
				<input className='form-input' value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('admin.audit.search')} />
				<select className='form-input' value={issue} onChange={(event) => setIssue(event.target.value as IngredientAuditIssue | 'ALL')}>
					<option value='ALL'>{t('admin.audit.all')}</option>
					{issueKeys.map((key) => <option key={key} value={key}>{t(`admin.audit.issues.${key}`)}</option>)}
				</select>
				<button className='btn btn--secondary' disabled={!selected.size || busy} onClick={exportSelected}>{t('admin.audit.export', { count: selected.size })}</button>
				<label className={`btn btn--primary${busy ? ' btn--disabled' : ''}`}>
					{t('admin.audit.import')}
					<input type='file' accept='.json,application/json' hidden disabled={busy} onChange={importFile} />
				</label>
			</div>

			<p className='admin-container__desc'>{t('admin.audit.desc')}</p>
			<div className='admin-audit__table-wrap'>
				<table className='admin-container__table admin-audit__table'>
					<thead><tr>
						<th><input type='checkbox' checked={filtered.length > 0 && filtered.every((item) => selected.has(item.id))} onChange={toggleAll} /></th>
						<th>{t('admin.ingredient')}</th><th>{t('admin.audit.problems')}</th><th>{t('admin.audit.usage')}</th><th>{t('admin.audit.created')}</th><th></th>
					</tr></thead>
					<tbody>
						{filtered.map((item) => (
							<tr key={item.id}>
								<td><input type='checkbox' checked={selected.has(item.id)} onChange={() => toggle(item.id)} /></td>
								<td><strong>{item.name}</strong><small>#{item.id} · {item.unit}</small></td>
								<td><div className='admin-audit__issues'>{item.issues.map((value) => <span key={value} className={`admin-container__pill admin-audit__issue admin-audit__issue--${value.toLowerCase()}`}>{t(`admin.audit.issues.${value}`)}</span>)}</div>
									{item.duplicateCandidates.map((candidate) => <button key={candidate.id} className='admin-audit__merge' disabled={busy} onClick={() => merge(item, candidate)}>{t('admin.audit.mergeInto', { name: candidate.name, score: Math.round(candidate.score * 100) })}</button>)}</td>
								<td title={t('admin.audit.usageDetail', item.usage)}><strong>{item.usage.total}</strong><small>{t('admin.audit.references')}</small></td>
								<td>{new Date(item.createdAt).toLocaleDateString()}<small>{item.reviewedAt ? t('admin.audit.reviewedDate', { date: new Date(item.reviewedAt).toLocaleDateString() }) : t('admin.audit.notReviewed')}</small></td>
								<td className='admin-container__actions'><button className='btn btn--secondary btn--sm' onClick={() => setEditing(item)}>{t('edit')}</button>{!item.reviewedAt && <button className='btn btn--primary btn--sm' onClick={() => markReviewed(item)}>{t('admin.audit.markReviewed')}</button>}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<IngredientFormModal
				isOpen={!!editing}
				onClose={() => setEditing(null)}
				onSaved={() => { setEditing(null); void load() }}
				autoSaveOnClose
				ingredient={editing ? { ...editing, conversions: editing.conversions.map((conversion) => ({ ...conversion, ingredientId: editing.id })) } : null}
			/>
		</div>
	)
}
