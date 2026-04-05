import '../layout.scss'

import { APP_NAME } from '@/utils/constants'

export const Footer = () => {
	return (
		<footer className='footer'>
			Copyright © {APP_NAME}· {new Date().getFullYear()} Todos los derechos reservados
		</footer>
	)
}
