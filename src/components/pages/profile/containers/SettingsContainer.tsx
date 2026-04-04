import './SettingsContainer.css'

import { useEffect, useState } from 'react'

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

export function SettingsContainer() {
	const { toast } = useDialog()
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [profile, setProfile] = useState<UserProfile>({})
	const [recommendedMacros, setRecommendedMacros] = useState<RecommendedMacros | null>(null)
	const [useCustomMacros, setUseCustomMacros] = useState(false)

	useEffect(() => {
		loadProfile()
	}, [])

	const loadProfile = async () => {
		try {
			const data = await profileService.getProfile()
			setProfile(data)
			setUseCustomMacros(!!data.customCalories)

			const macros = await profileService.getRecommendedMacros()
			setRecommendedMacros(macros)
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
			toast.success('Perfil guardado correctamente')
		} catch (error) {
			toast.error('Error al guardar el perfil')
		} finally {
			setSaving(false)
		}
	}

	const handleChange = <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => {
		setProfile((prev) => ({ ...prev, [field]: value }))
	}

	if (loading) {
		return <div className='loading'>Cargando...</div>
	}

	const hasRequiredData = profile.weight && profile.height && profile.age && profile.gender

	return (
		<div className='settings-container'>
			<div className='page-header'>
				<h1 className='page-title'>Ajustes</h1>
			</div>

			<div className='settings-grid'>
				<div className='settings-card'>
					<h2 className='settings-card-title'>Datos Personales</h2>
					<p className='settings-card-description'>
						Estos datos se usan para calcular tus necesidades calóricas diarias
					</p>

					<div className='settings-form'>
						<div className='profile-image-section'>
							<div className='profile-image-preview'>
								{profile.imageUrl ? (
									<img src={profile.imageUrl} alt='Foto de perfil' />
								) : (
									<span className='profile-image-placeholder'>👤</span>
								)}
							</div>
							<div className='profile-image-input'>
								<label className='form-label'>URL de foto de perfil</label>
								<input
									type='url'
									className='form-input'
									value={profile.imageUrl || ''}
									onChange={(e) => handleChange('imageUrl', e.target.value || undefined)}
									placeholder='https://ejemplo.com/mi-foto.jpg'
								/>
							</div>
						</div>

						<div className='form-row'>
							<div className='form-group'>
								<label className='form-label'>Peso (kg)</label>
								<input
									type='number'
									className='form-input'
									value={profile.weight || ''}
									onChange={(e) => handleChange('weight', parseFloat(e.target.value) || undefined)}
									placeholder='70'
									step='0.1'
								/>
							</div>
							<div className='form-group'>
								<label className='form-label'>Altura (cm)</label>
								<input
									type='number'
									className='form-input'
									value={profile.height || ''}
									onChange={(e) => handleChange('height', parseFloat(e.target.value) || undefined)}
									placeholder='175'
								/>
							</div>
						</div>

						<div className='form-row'>
							<div className='form-group'>
								<label className='form-label'>Edad</label>
								<input
									type='number'
									className='form-input'
									value={profile.age || ''}
									onChange={(e) => handleChange('age', parseInt(e.target.value) || undefined)}
									placeholder='30'
								/>
							</div>
							<div className='form-group'>
								<label className='form-label'>Género</label>
								<select
									className='form-input'
									value={profile.gender || ''}
									onChange={(e) =>
										handleChange(
											'gender',
											e.target.value ? (e.target.value as UserProfile['gender']) : undefined
										)
									}>
									<option value=''>Seleccionar...</option>
									<option value='male'>Hombre</option>
									<option value='female'>Mujer</option>
								</select>
							</div>
						</div>

						<div className='form-group'>
							<label className='form-label'>Nivel de Actividad</label>
							<select
								className='form-input'
								value={profile.activityLevel || 'moderate'}
								onChange={(e) => handleChange('activityLevel', e.target.value as ActivityLevel)}>
								{Object.entries(ACTIVITY_LEVEL_LABELS).map(([value, label]) => (
									<option key={value} value={value}>
										{label}
									</option>
								))}
							</select>
						</div>

						<div className='form-group'>
							<label className='form-label'>Objetivo</label>
							<div className='goal-options'>
								{Object.entries(GOAL_LABELS).map(([value, label]) => (
									<button
										key={value}
										type='button'
										className={`goal-btn ${profile.goal === value ? 'active' : ''}`}
										onClick={() => handleChange('goal', value as Goal)}>
										{value === 'lose' && '📉'}
										{value === 'maintain' && '⚖️'}
										{value === 'gain' && '📈'}
										<span>{label}</span>
									</button>
								))}
							</div>
						</div>
					</div>
				</div>

				<div className='settings-card'>
					<h2 className='settings-card-title'>Macros Recomendados</h2>

					{!hasRequiredData ? (
						<div className='settings-empty'>
							<p>Completa tus datos personales para ver los macros recomendados</p>
						</div>
					) : recommendedMacros && !useCustomMacros ? (
						<div className='macros-display'>
							<div className='macro-row'>
								<span className='macro-label'>Metabolismo Basal (BMR)</span>
								<span className='macro-value'>{recommendedMacros.bmr} kcal</span>
							</div>
							<div className='macro-row'>
								<span className='macro-label'>Gasto Energético (TDEE)</span>
								<span className='macro-value'>{recommendedMacros.tdee} kcal</span>
							</div>
							<div className='macros-divider'></div>
							<div className='macro-row macro-main'>
								<span className='macro-label'>Calorías Objetivo</span>
								<span className='macro-value macro-calories'>
									{recommendedMacros.calories} kcal
								</span>
							</div>
							<div className='macro-row'>
								<span className='macro-label'>Proteína</span>
								<span className='macro-value'>{recommendedMacros.protein}g</span>
							</div>
							<div className='macro-row'>
								<span className='macro-label'>Carbohidratos</span>
								<span className='macro-value'>{recommendedMacros.carbs}g</span>
							</div>
							<div className='macro-row'>
								<span className='macro-label'>Grasa</span>
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
							<span>Usar macros personalizados</span>
						</label>
					</div>

					{useCustomMacros && (
						<div className='custom-macros-form'>
							<div className='form-group'>
								<label className='form-label'>Calorías diarias</label>
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
									<label className='form-label'>Proteína (g)</label>
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
									<label className='form-label'>Carbos (g)</label>
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
									<label className='form-label'>Grasa (g)</label>
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

			<div className='settings-actions'>
				<button className='btn btn-primary btn-lg' onClick={handleSave} disabled={saving}>
					{saving ? 'Guardando...' : 'Guardar Cambios'}
				</button>
			</div>
		</div>
	)
}
