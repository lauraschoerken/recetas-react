import './MacrosContainer.scss'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { authService } from '@/services/auth'
import {
	ACTIVITY_LEVEL_LABELS,
	ActivityLevel,
	Goal,
	GOAL_LABELS,
	profileService,
	RecommendedMacros,
	UserProfile,
} from '@/services/profile'
import { useDialog } from '@/utils/dialog/DialogContext'

type ProfileSection = 'macros' | 'account'

export function MacrosContainer() {
	const { t } = useTranslation()
	const { toast } = useDialog()
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [activeSection, setActiveSection] = useState<ProfileSection>('macros')
	const [profile, setProfile] = useState<UserProfile>({})
	const [recommendedMacros, setRecommendedMacros] = useState<RecommendedMacros | null>(null)
	const [useCustomMacros, setUseCustomMacros] = useState(false)

	// Account state
	const [accountName, setAccountName] = useState('')
	const [accountEmail, setAccountEmail] = useState('')
	const [accountImageUrl, setAccountImageUrl] = useState('')
	const [currentPassword, setCurrentPassword] = useState('')
	const [newPassword, setNewPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [savingAccount, setSavingAccount] = useState(false)
	const [changingPassword, setChangingPassword] = useState(false)

	const NAV_ITEMS: { id: ProfileSection; label: string; icon: string }[] = [
		{ id: 'macros', label: t('profile.macros'), icon: '📊' },
		{ id: 'account', label: t('profile.account'), icon: '👤' },
	]

	useEffect(() => {
		loadProfile()
	}, [])

	const loadProfile = async () => {
		try {
			const [profileData, macros] = await Promise.all([
				profileService.getProfile(),
				profileService.getRecommendedMacros(),
			])
			setProfile(profileData)
			setUseCustomMacros(!!profileData.customCalories)
			setRecommendedMacros(macros)

			const user = authService.getUser()
			if (user) {
				setAccountName(user.name || '')
				setAccountEmail(user.email || '')
				setAccountImageUrl(user.imageUrl || '')
			}
		} catch (error) {
			console.error('Error loading profile:', error)
		} finally {
			setLoading(false)
		}
	}

	const handleSave = async () => {
		setSaving(true)
		try {
			const dataToSave = { ...profile }

			if (!useCustomMacros) {
				dataToSave.customCalories = undefined
				dataToSave.customProtein = undefined
				dataToSave.customCarbs = undefined
				dataToSave.customFat = undefined
			}

			await profileService.updateProfile(dataToSave)
			const macros = await profileService.getRecommendedMacros()
			setRecommendedMacros(macros)
			toast.success(t('profile.saved'))
		} catch {
			toast.error(t('profile.saveError'))
		} finally {
			setSaving(false)
		}
	}

	const handleChange = <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => {
		setProfile((prev) => ({ ...prev, [field]: value }))
	}

	const handleSaveAccount = async () => {
		setSavingAccount(true)
		try {
			await authService.updateAccount({
				name: accountName,
				email: accountEmail,
				imageUrl: accountImageUrl || undefined,
			})
			toast.success(t('profile.accountUpdated'))
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : t('profile.accountUpdateError')
			toast.error(msg)
		} finally {
			setSavingAccount(false)
		}
	}

	const handleChangePassword = async () => {
		if (newPassword !== confirmPassword) {
			toast.error(t('auth.passwordsDontMatch'))
			return
		}
		if (newPassword.length < 6) {
			toast.error(t('auth.passwordMinLength'))
			return
		}
		setChangingPassword(true)
		try {
			await authService.changePassword(currentPassword, newPassword)
			toast.success(t('profile.passwordChanged'))
			setCurrentPassword('')
			setNewPassword('')
			setConfirmPassword('')
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : t('profile.passwordChangeError')
			toast.error(msg)
		} finally {
			setChangingPassword(false)
		}
	}

	if (loading) {
		return <div className='loading'>{t('settings.loading')}</div>
	}

	const hasRequiredData = profile.weight && profile.height && profile.age && profile.gender

	return (
		<div className='macros-container'>
			<div className='page-header'>
				<h1 className='page-title'>{t('profile.title')}</h1>
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
					{activeSection === 'macros' && (
						<>
							<div className='macros-grid'>
								<div className='macros-card'>
									<h2 className='macros-card-title'>{t('profile.personalData')}</h2>
									<p className='macros-card-description'>{t('profile.personalDataDesc')}</p>

									<div className='macros-form'>
										<div className='form-row'>
											<div className='form-group'>
												<label className='form-label'>{t('profile.weight')}</label>
												<input
													type='number'
													className='form-input'
													value={profile.weight || ''}
													onChange={(e) =>
														handleChange('weight', parseFloat(e.target.value) || undefined)
													}
													placeholder='70'
													step='0.1'
												/>
											</div>
											<div className='form-group'>
												<label className='form-label'>{t('profile.height')}</label>
												<input
													type='number'
													className='form-input'
													value={profile.height || ''}
													onChange={(e) =>
														handleChange('height', parseFloat(e.target.value) || undefined)
													}
													placeholder='175'
												/>
											</div>
										</div>

										<div className='form-row'>
											<div className='form-group'>
												<label className='form-label'>{t('profile.age')}</label>
												<input
													type='number'
													className='form-input'
													value={profile.age || ''}
													onChange={(e) =>
														handleChange('age', parseInt(e.target.value) || undefined)
													}
													placeholder='30'
												/>
											</div>
											<div className='form-group'>
												<label className='form-label'>{t('profile.gender')}</label>
												<select
													className='form-input'
													value={profile.gender || ''}
													onChange={(e) =>
														handleChange(
															'gender',
															e.target.value ? (e.target.value as UserProfile['gender']) : undefined
														)
													}>
													<option value=''>{t('profile.selectGender')}</option>
													<option value='male'>{t('profile.male')}</option>
													<option value='female'>{t('profile.female')}</option>
												</select>
											</div>
										</div>

										<div className='form-group'>
											<label className='form-label'>{t('profile.activityLevel')}</label>
											<select
												className='form-input'
												value={profile.activityLevel || 'moderate'}
												onChange={(e) =>
													handleChange('activityLevel', e.target.value as ActivityLevel)
												}>
												{Object.entries(ACTIVITY_LEVEL_LABELS).map(([value, label]) => (
													<option key={value} value={value}>
														{label}
													</option>
												))}
											</select>
										</div>

										<div className='form-group'>
											<label className='form-label'>{t('profile.goal')}</label>
											<div className='goal-options'>
												{Object.entries(GOAL_LABELS).map(([value, label]) => (
													<button
														key={value}
														type='button'
														className={`goal-btn ${profile.goal === value ? 'active' : ''}`}
														onClick={() => handleChange('goal', value as Goal)}>
														<span>{label}</span>
													</button>
												))}
											</div>
										</div>
									</div>
								</div>

								<div className='macros-card'>
									<h2 className='macros-card-title'>{t('profile.recommendedMacros')}</h2>

									{!hasRequiredData ? (
										<div className='macros-empty'>
											<p>{t('profile.completeData')}</p>
										</div>
									) : recommendedMacros && !useCustomMacros ? (
										<div className='macros-display'>
											<div className='macro-row'>
												<span className='macro-label'>{t('profile.bmr')}</span>
												<span className='macro-value'>{recommendedMacros.bmr} kcal</span>
											</div>
											<div className='macro-row'>
												<span className='macro-label'>{t('profile.tdee')}</span>
												<span className='macro-value'>{recommendedMacros.tdee} kcal</span>
											</div>
											<div className='macros-divider'></div>
											<div className='macro-row macro-main'>
												<span className='macro-label'>{t('profile.targetCalories')}</span>
												<span className='macro-value macro-calories'>
													{recommendedMacros.calories} kcal
												</span>
											</div>
											<div className='macro-row'>
												<span className='macro-label'>{t('profile.protein')}</span>
												<span className='macro-value'>{recommendedMacros.protein}g</span>
											</div>
											<div className='macro-row'>
												<span className='macro-label'>{t('profile.carbs')}</span>
												<span className='macro-value'>{recommendedMacros.carbs}g</span>
											</div>
											<div className='macro-row'>
												<span className='macro-label'>{t('profile.fat')}</span>
												<span className='macro-value'>{recommendedMacros.fat}g</span>
											</div>
										</div>
									) : null}

									<div className='custom-macros-toggle'>
										<label className='toggle-label'>
											<input
												type='checkbox'
												checked={useCustomMacros}
												onChange={(e) => setUseCustomMacros(e.target.checked)}
											/>
											<span>{t('profile.useCustomMacros')}</span>
										</label>
									</div>

									{useCustomMacros && (
										<div className='custom-macros-form'>
											<div className='form-group'>
												<label className='form-label'>{t('profile.dailyCalories')}</label>
												<input
													type='number'
													className='form-input'
													value={profile.customCalories || ''}
													onChange={(e) =>
														handleChange('customCalories', parseInt(e.target.value) || undefined)
													}
													placeholder='2000'
												/>
											</div>
											<div className='form-row'>
												<div className='form-group'>
													<label className='form-label'>{t('profile.proteinG')}</label>
													<input
														type='number'
														className='form-input'
														value={profile.customProtein || ''}
														onChange={(e) =>
															handleChange('customProtein', parseInt(e.target.value) || undefined)
														}
														placeholder='150'
													/>
												</div>
												<div className='form-group'>
													<label className='form-label'>{t('profile.carbsG')}</label>
													<input
														type='number'
														className='form-input'
														value={profile.customCarbs || ''}
														onChange={(e) =>
															handleChange('customCarbs', parseInt(e.target.value) || undefined)
														}
														placeholder='250'
													/>
												</div>
												<div className='form-group'>
													<label className='form-label'>{t('profile.fatG')}</label>
													<input
														type='number'
														className='form-input'
														value={profile.customFat || ''}
														onChange={(e) =>
															handleChange('customFat', parseInt(e.target.value) || undefined)
														}
														placeholder='65'
													/>
												</div>
											</div>
										</div>
									)}
								</div>
							</div>

							<div className='macros-actions'>
								<button className='btn btn-primary btn-lg' onClick={handleSave} disabled={saving}>
									{saving ? t('profile.saving') : t('profile.saveChanges')}
								</button>
							</div>
						</>
					)}

					{activeSection === 'account' && (
						<>
							<div className='settings-card'>
								<h2 className='settings-card-title'>{t('profile.accountData')}</h2>
								<p className='settings-card-description'>{t('profile.accountDataDesc')}</p>

								<div className='macros-form'>
									<div className='profile-image-section'>
										<div className='profile-image-preview'>
											{accountImageUrl ? (
												<img src={accountImageUrl} alt={t('profile.imageUrl')} />
											) : (
												<span className='profile-image-placeholder'>👤</span>
											)}
										</div>
										<div className='profile-image-input'>
											<label className='form-label'>{t('profile.imageUrl')}</label>
											<input
												type='url'
												className='form-input'
												value={accountImageUrl}
												onChange={(e) => setAccountImageUrl(e.target.value)}
												placeholder='https://ejemplo.com/mi-foto.jpg'
											/>
										</div>
									</div>

									<div className='form-group'>
										<label className='form-label'>{t('auth.name')}</label>
										<input
											type='text'
											className='form-input'
											value={accountName}
											onChange={(e) => setAccountName(e.target.value)}
											placeholder={t('auth.yourName')}
										/>
									</div>

									<div className='form-group'>
										<label className='form-label'>{t('profile.email')}</label>
										<input
											type='email'
											className='form-input'
											value={accountEmail}
											onChange={(e) => setAccountEmail(e.target.value)}
											placeholder='tu@email.com'
										/>
									</div>

									<div className='macros-actions'>
										<button
											className='btn btn-primary'
											onClick={handleSaveAccount}
											disabled={savingAccount}>
											{savingAccount ? t('profile.saving') : t('profile.saveData')}
										</button>
									</div>
								</div>
							</div>

							<div className='settings-card' style={{ marginTop: '1.5rem' }}>
								<h2 className='settings-card-title'>{t('profile.changePassword')}</h2>
								<p className='settings-card-description'>{t('profile.changePasswordDesc')}</p>

								<div className='macros-form'>
									<div className='form-group'>
										<label className='form-label'>{t('profile.currentPassword')}</label>
										<input
											type='password'
											className='form-input'
											value={currentPassword}
											onChange={(e) => setCurrentPassword(e.target.value)}
											placeholder='••••••'
										/>
									</div>
									<div className='form-row'>
										<div className='form-group'>
											<label className='form-label'>{t('profile.newPassword')}</label>
											<input
												type='password'
												className='form-input'
												value={newPassword}
												onChange={(e) => setNewPassword(e.target.value)}
												placeholder='••••••'
											/>
										</div>
										<div className='form-group'>
											<label className='form-label'>{t('profile.confirmNewPassword')}</label>
											<input
												type='password'
												className='form-input'
												value={confirmPassword}
												onChange={(e) => setConfirmPassword(e.target.value)}
												placeholder='••••••'
											/>
										</div>
									</div>
									<div className='macros-actions'>
										<button
											className='btn btn-primary'
											onClick={handleChangePassword}
											disabled={changingPassword || !currentPassword || !newPassword}>
											{changingPassword
												? t('profile.changingPassword')
												: t('profile.changePassword')}
										</button>
									</div>
								</div>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	)
}
