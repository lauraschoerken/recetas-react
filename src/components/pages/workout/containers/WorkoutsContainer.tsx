import './WorkoutsContainer.scss'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { WorkoutFormModal } from '@/components/pages/workout/components/WorkoutFormModal'
import { WorkoutImportModal } from '@/components/pages/workout/components/WorkoutImportModal'
import { WorkoutTemplateModal } from '@/components/pages/workout/components/WorkoutTemplateModal'
import { Workout, WorkoutInput, WorkoutTemplate, WorkoutTemplateInput, workoutService } from '@/services/workout'
import { useDialog } from '@/utils/dialog/DialogContext'

export function WorkoutsContainer() {
	const { t } = useTranslation()
	const { confirm, toast } = useDialog()
	const [items, setItems] = useState<Workout[]>([])
	const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [modalOpen, setModalOpen] = useState(false)
	const [templateModalOpen, setTemplateModalOpen] = useState(false)
	const [importOpen, setImportOpen] = useState(false)
	const [importing, setImporting] = useState(false)
	const [editing, setEditing] = useState<Workout | null>(null)
	const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null)
	const [templateToLog, setTemplateToLog] = useState<WorkoutTemplate | null>(null)

	const load = async () => {
		try {
			const [workouts, saved] = await Promise.all([workoutService.list(), workoutService.listTemplates()])
			setItems(workouts)
			setTemplates(saved)
		} finally { setLoading(false) }
	}
	useEffect(() => { void load() }, [])

	const save = async (data: WorkoutInput) => {
		setSaving(true)
		try {
			if (editing) await workoutService.update(editing.id, data)
			else await workoutService.create(data)
			setModalOpen(false); setEditing(null); setTemplateToLog(null); await load(); toast.success(t('workouts.saved'))
		} catch { toast.error(t('workouts.saveError')) } finally { setSaving(false) }
	}

	const saveTemplate = async (data: WorkoutTemplateInput) => {
		setSaving(true)
		try {
			if (editingTemplate) await workoutService.updateTemplate(editingTemplate.id, data)
			else await workoutService.createTemplate(data)
			setTemplateModalOpen(false); setEditingTemplate(null); await load(); toast.success(t('workouts.templateSaved'))
		} catch { toast.error(t('workouts.templateSaveError')) } finally { setSaving(false) }
	}

	const importJson = async (json: string) => {
		setImporting(true)
		try {
			const result = await workoutService.importJson(json)
			setImportOpen(false); await load()
			toast.success(t('workouts.importSuccess', { entries: result.importedCount, templates: result.templatesImported }))
		} catch (error) { toast.error(error instanceof Error ? error.message : t('workouts.importError')) } finally { setImporting(false) }
	}

	const remove = async (item: Workout) => {
		if (!await confirm({ title: t('workouts.deleteTitle'), message: t('workouts.deleteConfirm'), confirmText: t('delete'), type: 'danger' })) return
		try { await workoutService.remove(item.id); setItems((current) => current.filter((w) => w.id !== item.id)) } catch { toast.error(t('workouts.deleteError')) }
	}
	const removeTemplate = async (item: WorkoutTemplate) => {
		if (!await confirm({ title: t('workouts.deleteTemplateTitle'), message: t('workouts.deleteTemplateConfirm'), confirmText: t('delete'), type: 'danger' })) return
		try { await workoutService.removeTemplate(item.id); setTemplates((current) => current.filter((w) => w.id !== item.id)) } catch { toast.error(t('workouts.deleteError')) }
	}

	const templateInitialValues: Partial<WorkoutInput> | null = templateToLog ? {
		title: templateToLog.title, durationMinutes: templateToLog.durationMinutes, caloriesBurned: templateToLog.caloriesBurned,
		averageHeartRate: templateToLog.averageHeartRate, exercises: templateToLog.exercises, notes: templateToLog.notes,
		addCaloriesToGoal: templateToLog.defaultAddCaloriesToGoal, templateId: templateToLog.id,
	} : null

	return <div className='workouts-page'>
		<div className='page-header workouts-header'><div><h1 className='page-title'>{t('workouts.title')}</h1><p>{t('workouts.subtitle')}</p></div><div className='workouts-header-actions'><button className='btn btn-outline' onClick={() => setImportOpen(true)}>{t('workouts.importJson')}</button><button className='btn btn-outline' onClick={() => { setEditingTemplate(null); setTemplateModalOpen(true) }}>{t('workouts.addTemplate')}</button><button className='btn btn-primary' onClick={() => { setEditing(null); setTemplateToLog(null); setModalOpen(true) }}>{t('workouts.addCustom')}</button></div></div>

		{templates.length > 0 && <section className='workout-templates'><div className='workout-section-heading'><h2>{t('workouts.savedWorkouts')}</h2><span>{templates.length}</span></div><div className='workout-template-grid'>{templates.map((template) => <article className='workout-template-card' key={template.id}><div><h3>{template.title}</h3><div className='workout-metrics'>{template.durationMinutes && <span>⏱ {template.durationMinutes} min</span>}{template.caloriesBurned != null && <span>🔥 {template.caloriesBurned} kcal</span>}</div>{template.exercises && <p>{template.exercises}</p>}</div><div className='workout-template-actions'><button className='btn btn-primary btn-sm' onClick={() => { setTemplateToLog(template); setEditing(null); setModalOpen(true) }}>{t('workouts.logThis')}</button><button className='btn btn-outline btn-sm' onClick={() => { setEditingTemplate(template); setTemplateModalOpen(true) }}>{t('edit')}</button><button className='btn btn-outline btn-sm' onClick={() => removeTemplate(template)}>{t('delete')}</button></div></article>)}</div></section>}

		<div className='workout-section-heading'><h2>{t('workouts.history')}</h2><span>{items.length}</span></div>
		{loading ? <div className='loading'>{t('loading')}</div> : items.length === 0 ? <button className='workouts-empty' onClick={() => setModalOpen(true)}><span>🏃</span><strong>{t('workouts.empty')}</strong><small>{t('workouts.emptyHint')}</small></button> : <div className='workout-list'>{items.map((item) => <article className='workout-card' key={item.id}>
			<div className='workout-card-date'><strong>{new Date(item.performedAt).toLocaleDateString(undefined,{day:'2-digit'})}</strong><span>{new Date(item.performedAt).toLocaleDateString(undefined,{month:'short'})}</span></div>
			<div className='workout-card-body'><div className='workout-card-title'><h2>{item.title}</h2>{item.templateId && <span className='workout-template-badge'>{t('workouts.fromSaved')}</span>}{item.addCaloriesToGoal && <span className='workout-goal-badge'>+ {item.caloriesBurned || 0} kcal</span>}</div><div className='workout-metrics'>{item.durationMinutes && <span>⏱ {item.durationMinutes} min</span>}{item.caloriesBurned != null && <span>🔥 {item.caloriesBurned} kcal</span>}{item.averageHeartRate && <span>♥ {item.averageHeartRate} ppm</span>}</div>{item.exercises && <p className='workout-exercises'>{item.exercises}</p>}{item.notes && <p className='workout-notes'>{item.notes}</p>}</div>
			<div className='workout-card-actions'><button className='btn btn-outline btn-sm' onClick={() => { setEditing(item); setTemplateToLog(null); setModalOpen(true) }}>{t('edit')}</button><button className='btn btn-outline btn-sm' onClick={() => remove(item)}>{t('delete')}</button></div>
		</article>)}</div>}
		<WorkoutFormModal open={modalOpen} workout={editing} initialValues={templateInitialValues} saving={saving} onClose={() => { setModalOpen(false); setEditing(null); setTemplateToLog(null) }} onSave={save} />
		<WorkoutTemplateModal open={templateModalOpen} template={editingTemplate} saving={saving} onClose={() => { setTemplateModalOpen(false); setEditingTemplate(null) }} onSave={saveTemplate} />
		<WorkoutImportModal open={importOpen} importing={importing} onClose={() => setImportOpen(false)} onImport={importJson} />
	</div>
}
