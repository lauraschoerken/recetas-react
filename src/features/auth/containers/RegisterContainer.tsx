import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RegisterForm } from '../components/RegisterForm'
import { authService } from '@/services/auth'

interface RegisterContainerProps {
	onLogin?: () => void
}

export function RegisterContainer({ onLogin }: RegisterContainerProps) {
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const navigate = useNavigate()

	const handleSubmit = async (name: string, email: string, password: string) => {
		setError(null)
		setLoading(true)

		try {
			await authService.register({ name, email, password })
			onLogin?.()
			navigate('/recipes')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al crear cuenta')
		} finally {
			setLoading(false)
		}
	}

	return <RegisterForm onSubmit={handleSubmit} error={error} loading={loading} />
}
