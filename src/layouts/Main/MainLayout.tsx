import '../layout.scss'

import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'

import { Footer } from '../elements/Footer'
import { Header } from '../elements/Header'
import { householdService } from '@/services/household'
import { useDialog } from '@/utils/dialog/DialogContext'

export const MainLayout = () => {
	const { t } = useTranslation()
	const { toast } = useDialog()

	useEffect(() => {
		if (sessionStorage.getItem('pending-invites-toast-shown') === '1') return
		let alive = true
		householdService
			.getPendingInvites()
			.then((invites) => {
				if (!alive || invites.length === 0) return
				toast.info(t('settings.pendingInvitesToast', { count: invites.length }))
				sessionStorage.setItem('pending-invites-toast-shown', '1')
			})
			.catch(() => {
				// ignore, not critical for navigation
			})
		return () => {
			alive = false
		}
	}, [t, toast])

	return (
		<div className='main-layout'>
			<Header />
			<main className='main container'>
				<Outlet />
			</main>
			<Footer />
		</div>
	)
}
