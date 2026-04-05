import '../layout.scss'

import { Link } from 'react-router-dom'

import LanguageSelect from '@/components/elements/Languague/LanguagueSelect'
import { ThemeToggle } from '@/components/elements/Theme/ThemeToggle'
import { APP_NAME } from '@/utils/constants'

export const Header = () => {
	return (
		<header className='header'>
			<div className='container header__inner'>
				<Link to='/' className='link brand'>
					{APP_NAME}
				</Link>
				<nav className='nav__actions'>
					<ThemeToggle />
					<LanguageSelect />
				</nav>
			</div>
		</header>
	)
}
