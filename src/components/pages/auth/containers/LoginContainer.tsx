import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { authService } from '@/services/auth'

import { LoginForm } from '../components/LoginForm'

interface LoginContainerProps {
	onLogin?: () => void
}

export function LoginContainer({ onLogin }: LoginContainerProps) {
	const { t } = useTranslation()
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const navigate = useNavigate()

	const handleSubmit = async (email: string, password: string) => {
		setError(null)
		setLoading(true)

		try {
			await authService.login({ email, password })
			onLogin?.()
			navigate('/recipes')
		} catch (err) {
			setError(err instanceof Error ? err.message : t('auth.loginError'))
		} finally {
			setLoading(false)
		}
	}

	return <LoginForm onSubmit={handleSubmit} error={error} loading={loading} />
}
