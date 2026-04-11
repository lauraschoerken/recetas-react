import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { householdService } from '@/services/household'
import { useDialog } from '@/utils/dialog/DialogContext'

export function AcceptInviteContainer() {
	const { t } = useTranslation()
	const { confirm, toast } = useDialog()
	const [searchParams] = useSearchParams()
	const navigate = useNavigate()
	const [processing, setProcessing] = useState(false)
	const [done, setDone] = useState(false)

	const token = searchParams.get('token')

	useEffect(() => {
		if (token && !done) {
			handleAccept()
		}
	}, [token])

	const handleAccept = async () => {
		if (!token) return

		const ok = await confirm({
			title: t('settings.joinHouseholdTitle'),
			message: t('settings.joinHouseholdMsg'),
			confirmText: t('settings.joinBtn'),
			type: 'warning',
		})

		if (!ok) {
			navigate('/settings')
			return
		}

		setProcessing(true)
		try {
			await householdService.acceptInvite(token)
			toast.success(t('settings.joinedSuccess'))
			setDone(true)
			navigate('/settings')
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : t('settings.joinError')
			toast.error(msg)
			navigate('/settings')
		} finally {
			setProcessing(false)
		}
	}

	if (!token) {
		return (
			<div className='loading'>
				<p>{t('settings.invalidInvite')}</p>
			</div>
		)
	}

	return (
		<div className='loading'>
			<p>{processing ? t('settings.processingInvite') : t('settings.loading')}</p>
		</div>
	)
}
