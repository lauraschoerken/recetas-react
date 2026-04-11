import './AuthForm.scss'

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

interface RegisterFormProps {
	onSubmit: (name: string, email: string, password: string) => void
	error: string | null
	loading: boolean
}

export function RegisterForm({ onSubmit, error, loading }: RegisterFormProps) {
	const { t } = useTranslation()
	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [validationError, setValidationError] = useState<string | null>(null)

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		setValidationError(null)

		if (password !== confirmPassword) {
			setValidationError(t('auth.passwordsDontMatch'))
			return
		}

		if (password.length < 6) {
			setValidationError(t('auth.passwordMinLength'))
			return
		}

		onSubmit(name, email, password)
	}

	const displayError = validationError || error

	return (
		<div className='auth-container'>
			<div className='auth-card'>
				<h1 className='auth-title'>{t('auth.createAccount')}</h1>
				<p className='auth-subtitle'>{t('auth.registerSubtitle')}</p>

				<form onSubmit={handleSubmit} className='auth-form'>
					{displayError && <div className='auth-error'>{displayError}</div>}

					<div className='form-group'>
						<label className='form-label'>{t('auth.name')}</label>
						<input
							type='text'
							className='form-input'
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder={t('auth.yourName')}
							required
						/>
					</div>

					<div className='form-group'>
						<label className='form-label'>{t('auth.email')}</label>
						<input
							type='email'
							className='form-input'
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder='tu@email.com'
							required
						/>
					</div>

					<div className='form-group'>
						<label className='form-label'>{t('auth.password')}</label>
						<input
							type='password'
							className='form-input'
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder='••••••••'
							required
						/>
					</div>

					<div className='form-group'>
						<label className='form-label'>{t('auth.confirmPassword')}</label>
						<input
							type='password'
							className='form-input'
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							placeholder='••••••••'
							required
						/>
					</div>

					<button type='submit' className='btn btn-primary auth-submit' disabled={loading}>
						{loading ? t('auth.creatingAccount') : t('auth.createAccountBtn')}
					</button>
				</form>

				<p className='auth-footer'>
					{t('auth.hasAccount')} <Link to='/login'>{t('auth.loginLink')}</Link>
				</p>
			</div>
		</div>
	)
}
