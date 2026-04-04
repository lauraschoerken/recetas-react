import './AuthForm.css'

import { useState } from 'react'
import { Link } from 'react-router-dom'

interface LoginFormProps {
	onSubmit: (email: string, password: string) => void
	error: string | null
	loading: boolean
}

export function LoginForm({ onSubmit, error, loading }: LoginFormProps) {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		onSubmit(email, password)
	}

	return (
		<div className='auth-container'>
			<div className='auth-card'>
				<h1 className='auth-title'>Iniciar Sesión</h1>
				<p className='auth-subtitle'>Accede a tus recetas</p>

				<form onSubmit={handleSubmit} className='auth-form'>
					{error && <div className='auth-error'>{error}</div>}

					<div className='form-group'>
						<label className='form-label'>Email</label>
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
						<label className='form-label'>Contraseña</label>
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
						{loading ? 'Entrando...' : 'Entrar'}
					</button>
				</form>

				<p className='auth-footer'>
					¿No tienes cuenta? <Link to='/register'>Regístrate</Link>
				</p>
			</div>
		</div>
	)
}
