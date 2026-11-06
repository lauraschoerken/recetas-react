import '../layout.scss'

import { APP_NAME } from '@/utils/constants'

export const Footer = () => {
	const currentYear = new Date().getFullYear()
	const copyrightYears = currentYear > 2025 ? `2025–${currentYear}` : '2025'

	return (
		<footer className='footer'>
			© {copyrightYears} Laura Schörken · {APP_NAME} · MIT License
		</footer>
	)
}
