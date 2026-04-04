import '../layout.scss'

export const Footer = () => {
	return (
		<footer className='footer'>
			Copyright © {import.meta.env.VITE_APP_NAME} · {new Date().getFullYear()} Todos los derechos
			reservados
		</footer>
	)
}
