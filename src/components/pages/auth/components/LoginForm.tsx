import './AuthForm.scss'

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

interface LoginFormProps {
	onSubmit: (email: string, password: string) => void
	error: string | null
	loading: boolean
}

export function LoginForm({ onSubmit, error, loading }: LoginFormProps) {
	const { t } = useTranslation()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		onSubmit(email, password)
	}

	return (
		<div className='auth-container'>
			<div className='auth-card'>
				<h1 className='auth-title'>{t('auth.login')}</h1>
				<p className='auth-subtitle'>{t('auth.loginSubtitle')}</p>

				<form onSubmit={handleSubmit} className='auth-form'>
					{error && <div className='auth-error'>{error}</div>}

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

					<button type='submit' className='btn btn-primary auth-submit' disabled={loading}>
						{loading ? t('auth.loggingIn') : t('auth.enter')}
					</button>
				</form>

				<p className='auth-footer'>
					{t('auth.noAccount')} <Link to='/register'>{t('auth.register')}</Link>
				</p>
			</div>
		</div>
	)
}
