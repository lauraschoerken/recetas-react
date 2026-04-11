import './SettingsContainer.scss'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { householdService, Household } from '@/services/household'
import { backupService } from '@/services/backup'
import { useDialog } from '@/utils/dialog/DialogContext'

type SettingsSection = 'household' | 'alerts' | 'pdf' | 'backup'

export function SettingsContainer() {
	const { t } = useTranslation()
	const { toast, confirm } = useDialog()
	const [loading, setLoading] = useState(true)
	const [activeSection, setActiveSection] = useState<SettingsSection>('household')

	const NAV_ITEMS: { id: SettingsSection; label: string; icon: string }[] = [
		{ id: 'household', label: t('settings.household'), icon: '\uD83C\uDFE0' },
		{ id: 'alerts', label: t('settings.alerts'), icon: '\uD83D\uDD14' },
		{ id: 'pdf', label: t('settings.pdfSettings'), icon: '\uD83D\uDCC4' },
		{ id: 'backup', label: t('settings.importExport'), icon: '\uD83D\uDCBE' },
	]

	// Household state
	const [household, setHousehold] = useState<Household | null>(null)
	const [householdName, setHouseholdName] = useState('')
	const [inviteEmail, setInviteEmail] = useState('')
	const [planningScope, setPlanningScope] = useState<'own' | 'all'>('own')
	const [joinCode, setJoinCode] = useState('')
	const [pendingInvites, setPendingInvites] = useState<
		{
			id: number
			email: string
			token: string
			household: { id: number; name: string }
			sender: { name: string }
		}[]
	>([])

	// Backup state
	const [importing, setImporting] = useState(false)
	const [importMode, setImportMode] = useState<'overwrite' | 'keep' | 'review'>('keep')

	// PDF settings state (stored in localStorage)
	const [pdfShowAuthor, setPdfShowAuthor] = useState(
		() => localStorage.getItem('pdfShowAuthor') === 'true'
	)
	const [pdfShowVisibility, setPdfShowVisibility] = useState(
		() => localStorage.getItem('pdfShowVisibility') === 'true'
	)

	useEffect(() => {
		loadAll()
	}, [])

	const loadAll = async () => {
		try {
			const hh = await householdService.get()
			setHousehold(hh)
		} catch (error) {
			console.error('Error loading household:', error)
		}

		try {
			const invites = await householdService.getPendingInvites()
			setPendingInvites(invites)
		} catch {
			console.error('Error loading pending invites')
		}

		try {
			const { profileService } = await import('@/services/profile')
			const profileData = await profileService.getProfile()
			setPlanningScope((profileData as any).planningAlertScope || 'own')
		} catch {
			console.error('Error loading planning scope')
		}

		setLoading(false)
	}

	const handleCreateHousehold = async () => {
		if (!householdName.trim()) return
		try {
			const hh = await householdService.create({ name: householdName.trim() })
			setHousehold(hh as any)
			setHouseholdName('')
			toast.success(t('settings.householdCreated'))
		} catch (e: any) {
			toast.error(e.message || t('settings.errorCreatingHousehold'))
		}
	}

	const handleInvite = async () => {
		if (!inviteEmail.trim() || !household) return
		try {
			await householdService.invite(household.id, inviteEmail.trim())
			setInviteEmail('')
			toast.success(t('settings.inviteSent'))
			const hh = await householdService.get()
			setHousehold(hh)
		} catch (e: any) {
			toast.error(e.message || t('settings.errorInviting'))
		}
	}

	const handleJoinByCode = async () => {
		if (!joinCode.trim()) return
		const ok = await confirm({
			title: t('settings.joinHouseholdTitle'),
			message: t('settings.joinHouseholdMsg'),
			confirmText: t('settings.joinBtn'),
			type: 'warning',
		})
		if (!ok) return
		try {
			const hh = await householdService.joinByCode(joinCode.trim())
			setHousehold(hh as any)
			setJoinCode('')
			toast.success(t('settings.joinedSuccess'))
		} catch (e: any) {
			toast.error(e.message || t('settings.joinError'))
		}
	}

	const handleAcceptPendingInvite = async (token: string) => {
		const ok = await confirm({
			title: t('settings.joinHouseholdTitle'),
			message: t('settings.joinHouseholdMsg'),
			confirmText: t('settings.joinBtn'),
			type: 'warning',
		})
		if (!ok) return
		try {
			const hh = await householdService.acceptInvite(token)
			setHousehold(hh as any)
			setPendingInvites([])
			toast.success(t('settings.joinedSuccess'))
		} catch (e: any) {
			toast.error(e.message || t('settings.joinError'))
		}
	}

	const handleRemoveMember = async (userId: number) => {
		if (!household) return
		const ok = await confirm({
			title: t('settings.removeMember'),
			message: t('settings.confirmRemove'),
			type: 'danger',
			confirmText: t('settings.remove'),
		})
		if (!ok) return
		try {
			await householdService.removeMember(household.id, userId)
			const hh = await householdService.get()
			setHousehold(hh)
			toast.success(t('settings.memberRemoved'))
		} catch (e: any) {
			toast.error(e.message || 'Error')
		}
	}

	const handleLeave = async () => {
		if (!household) return
		const ok = await confirm({
			title: t('settings.leaveHousehold'),
			message: t('settings.confirmLeave'),
			type: 'warning',
			confirmText: t('settings.leave'),
		})
		if (!ok) return
		try {
			await householdService.leave(household.id)
			setHousehold(null)
			toast.success(t('settings.leftHousehold'))
		} catch (e: any) {
			toast.error(e.message || 'Error')
		}
	}

	const handleUpdateHousehold = async (
		data: Partial<{ shareHome: boolean; shareShopping: boolean; shareAlerts: boolean }>
	) => {
		if (!household) return
		try {
			const updated = await householdService.update(household.id, data)
			setHousehold({ ...household, ...updated })
		} catch (e: any) {
			toast.error(e.message || 'Error')
		}
	}

	const handlePlanningScope = async (scope: 'own' | 'all') => {
		try {
			await householdService.updatePlanningScope(scope)
			setPlanningScope(scope)
			toast.success(t('settings.configSaved'))
		} catch {
			toast.error(t('settings.errorSaving'))
		}
	}

	const handleExport = async () => {
		try {
			await backupService.downloadBackupCsv()
			toast.success(t('settings.backupDownloaded'))
		} catch {
			toast.error(t('settings.errorExporting'))
		}
	}

	const handleExportJson = async () => {
		try {
			await backupService.downloadBackupJson()
			toast.success(t('settings.backupDownloaded'))
		} catch {
			toast.error(t('settings.errorExporting'))
		}
	}

	const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return
		setImporting(true)
		try {
			const result = await backupService.importBackupFile(file, importMode)
			const summary = Object.entries(result.results)
				.map(([key, val]) => `${key}: +${val.created}`)
				.join(', ')
			toast.success(`${t('settings.importComplete')}: ${summary}`)
			loadAll()
		} catch (err: any) {
			toast.error(err.message || t('settings.errorImporting'))
		} finally {
			setImporting(false)
			e.target.value = ''
		}
	}

	if (loading) {
		return <div className='loading'>{t('loading')}</div>
	}

	return (
		<div className='settings-container'>
			<div className='page-header'>
				<h1 className='page-title'>{t('settings.title')}</h1>
			</div>

			<div className='settings-layout'>
				<nav className='settings-nav'>
					{NAV_ITEMS.map((item) => (
						<button
							key={item.id}
							className={`settings-nav-item ${activeSection === item.id ? 'active' : ''}`}
							onClick={() => setActiveSection(item.id)}>
							<span className='settings-nav-icon'>{item.icon}</span>
							<span className='settings-nav-label'>{item.label}</span>
						</button>
					))}
				</nav>

				<div className='settings-content'>
					{activeSection === 'household' && (
						<div className='settings-card'>
							<h2 className='settings-card-title'>{t('settings.household')}</h2>
							<p className='settings-card-description'>{t('settings.householdDesc')}</p>

							{!household ? (
								<div className='household-create'>
									{pendingInvites.length > 0 && (
										<div className='household-pending-invites'>
											<h4>{t('settings.pendingInvitesForYou')}</h4>
											{pendingInvites.map((inv) => (
												<div key={inv.id} className='household-pending-invite'>
													<span>
														{inv.sender.name} {t('settings.invitedYouTo')}{' '}
														<strong>{inv.household.name}</strong>
													</span>
													<button
														className='btn btn-primary btn-sm'
														onClick={() => handleAcceptPendingInvite(inv.token)}>
														{t('settings.joinBtn')}
													</button>
												</div>
											))}
										</div>
									)}

									<h4>{t('settings.createHousehold')}</h4>
									<div className='form-row'>
										<div className='form-group' style={{ flex: 1 }}>
											<input
												type='text'
												className='form-input'
												value={householdName}
												onChange={(e) => setHouseholdName(e.target.value)}
												placeholder={t('settings.householdName')}
											/>
										</div>
										<button className='btn btn-primary' onClick={handleCreateHousehold}>
											{t('settings.createHousehold')}
										</button>
									</div>

									<div style={{ marginTop: '1.5rem' }}>
										<h4>{t('settings.joinHouseholdTitle')}</h4>
										<p className='settings-card-description'>
											{t('settings.joinHouseholdCodeDesc')}
										</p>
										<div className='form-row'>
											<div className='form-group' style={{ flex: 1 }}>
												<input
													type='text'
													className='form-input'
													value={joinCode}
													onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
													placeholder={t('settings.joinCodePlaceholder')}
													maxLength={8}
													style={{ letterSpacing: '0.15em', fontFamily: 'monospace' }}
												/>
											</div>
											<button
												className='btn btn-primary'
												onClick={handleJoinByCode}
												disabled={joinCode.trim().length < 4}>
												{t('settings.joinBtn')}
											</button>
										</div>
									</div>
								</div>
							) : (
								<div className='household-info'>
									<div className='household-header'>
										<h3>{household.name}</h3>
										<span className='household-role'>{household.myRole}</span>
									</div>

									{household.joinCode && (
										<div className='household-join-code'>
											<span className='join-code-label'>{t('settings.joinCode')}: </span>
											<code className='join-code-value'>{household.joinCode}</code>
											<button
												className='btn btn-outline btn-sm'
												style={{ marginLeft: '0.5rem' }}
												onClick={() => {
													navigator.clipboard.writeText(household.joinCode!)
													toast.success(t('settings.codeCopied'))
												}}>
												{t('settings.copyCode')}
											</button>
										</div>
									)}

									<div className='household-toggles'>
										<label className='toggle-label'>
											<input
												type='checkbox'
												checked={household.shareHome}
												onChange={(e) => handleUpdateHousehold({ shareHome: e.target.checked })}
											/>
											<span>{t('settings.shareInventory')}</span>
										</label>
										<label className='toggle-label'>
											<input
												type='checkbox'
												checked={household.shareShopping}
												onChange={(e) => handleUpdateHousehold({ shareShopping: e.target.checked })}
											/>
											<span>{t('settings.shareShopping')}</span>
										</label>
										<label className='toggle-label'>
											<input
												type='checkbox'
												checked={household.shareAlerts}
												onChange={(e) => handleUpdateHousehold({ shareAlerts: e.target.checked })}
											/>
											<span>{t('settings.shareAlerts')}</span>
										</label>
									</div>

									<div className='household-members'>
										<h4>{t('settings.members')}</h4>
										{household.members.map((m) => (
											<div key={m.id} className='household-member'>
												<span>
													{m.user?.name || m.user?.email} ({m.role})
												</span>
												{household.myRole === 'ADMIN' &&
													m.userId !==
														household.members.find((mm) => mm.role === 'ADMIN')?.userId && (
														<button
															className='btn btn-outline btn-sm'
															onClick={() => handleRemoveMember(m.userId)}>
															{t('settings.remove')}
														</button>
													)}
											</div>
										))}
									</div>

									{household.invites && household.invites.length > 0 && (
										<div className='household-invites'>
											<h4>{t('settings.pendingInvites')}</h4>
											{household.invites.map((inv) => (
												<div key={inv.id} className='household-invite'>
													{inv.email} \u2014 {t('settings.expires')}{' '}
													{new Date(inv.expiresAt).toLocaleDateString()}
												</div>
											))}
										</div>
									)}

									<div className='form-row' style={{ marginTop: '1rem' }}>
										<div className='form-group' style={{ flex: 1 }}>
											<input
												type='email'
												className='form-input'
												value={inviteEmail}
												onChange={(e) => setInviteEmail(e.target.value)}
												placeholder={t('settings.inviteEmailPlaceholder')}
											/>
										</div>
										<button className='btn btn-primary' onClick={handleInvite}>
											{t('settings.invite')}
										</button>
									</div>

									<div style={{ marginTop: '1rem' }}>
										<button className='btn btn-outline btn-sm' onClick={handleLeave}>
											{t('settings.leaveHousehold')}
										</button>
									</div>
								</div>
							)}
						</div>
					)}

					{activeSection === 'alerts' && (
						<div className='settings-card'>
							<h2 className='settings-card-title'>{t('settings.stockAlertsPlanning')}</h2>
							<p className='settings-card-description'>{t('settings.stockAlertsDesc')}</p>
							<div className='form-group'>
								<select
									className='form-input'
									value={planningScope}
									onChange={(e) => handlePlanningScope(e.target.value as 'own' | 'all')}>
									<option value='own'>{t('settings.onlyMyPlanning')}</option>
									<option value='all'>{t('settings.allMembersPlanning')}</option>
								</select>
							</div>
							<p className='settings-card-description' style={{ marginTop: '1rem' }}>
								{t('settings.thresholdsConfigHint')}
							</p>
						</div>
					)}

					{activeSection === 'pdf' && (
						<div className='settings-card'>
							<h2 className='settings-card-title'>{t('settings.pdfSettings')}</h2>
							<p className='settings-card-description'>{t('settings.pdfSettingsDesc')}</p>

							<div className='household-toggles'>
								<label className='toggle-label'>
									<input
										type='checkbox'
										checked={pdfShowAuthor}
										onChange={(e) => {
											setPdfShowAuthor(e.target.checked)
											localStorage.setItem('pdfShowAuthor', String(e.target.checked))
										}}
									/>
									<span>{t('settings.pdfShowAuthor')}</span>
								</label>
								<label className='toggle-label'>
									<input
										type='checkbox'
										checked={pdfShowVisibility}
										onChange={(e) => {
											setPdfShowVisibility(e.target.checked)
											localStorage.setItem('pdfShowVisibility', String(e.target.checked))
										}}
									/>
									<span>{t('settings.pdfShowVisibility')}</span>
								</label>
							</div>
						</div>
					)}

					{activeSection === 'backup' && (
						<div className='settings-card'>
							<h2 className='settings-card-title'>{t('settings.importExport')}</h2>
							<p className='settings-card-description'>{t('settings.backupDesc')}</p>

							<div className='backup-actions'>
								<button className='btn btn-primary' onClick={handleExport}>
									{t('settings.exportBackupCsvZip')}
								</button>
								<button className='btn btn-outline' onClick={handleExportJson}>
									{t('settings.exportBackupJson')}
								</button>

								<div className='backup-import'>
									<div className='form-group'>
										<label className='form-label'>{t('settings.importMode')}</label>
										<select
											className='form-input'
											value={importMode}
											onChange={(e) => setImportMode(e.target.value as any)}>
											<option value='keep'>{t('settings.importKeep')}</option>
											<option value='overwrite'>{t('settings.importOverwrite')}</option>
											<option value='review'>{t('settings.importReview')}</option>
										</select>
									</div>
									<label className='btn btn-outline' style={{ cursor: 'pointer' }}>
										{importing ? t('settings.importing') : t('settings.importBackup')}
										<input
											type='file'
											accept='.json,.csv,.zip'
											onChange={handleImport}
											style={{ display: 'none' }}
											disabled={importing}
										/>
									</label>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
