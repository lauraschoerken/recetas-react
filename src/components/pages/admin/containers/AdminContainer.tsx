import './AdminContainer.scss'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { IngredientFormModal } from '@/components/pages/ingredient/containers/IngredientFormModal'
import { adminService, AdminUser, PendingIngredient, Proposal } from '@/services/admin'
import { useDialog } from '@/utils/dialog/DialogContext'

type Tab = 'users' | 'pendingIngredients' | 'proposals'

export function AdminContainer() {
	const { t } = useTranslation()
	const { toast, confirm } = useDialog()
	const [tab, setTab] = useState<Tab>('users')
	const [users, setUsers] = useState<AdminUser[]>([])
	const [pendingIngredients, setPendingIngredients] = useState<PendingIngredient[]>([])
	const [proposals, setProposals] = useState<Proposal[]>([])
	const [loading, setLoading] = useState(false)
	const [search, setSearch] = useState('')
	const [adminNotes, setAdminNotes] = useState<Record<number, string>>({})
	const [selectedIngredient, setSelectedIngredient] = useState<PendingIngredient | null>(null)

	useEffect(() => {
		loadData()
		// eslint-disable-line react-hooks/exhaustive-deps
	}, [tab])

	const loadData = async () => {
		setLoading(true)
		try {
			if (tab === 'users') {
				const res = await adminService.getUsers({ search: search || undefined })
				setUsers(res.data)
			} else if (tab === 'pendingIngredients') {
				const data = await adminService.getPendingIngredients()
				setPendingIngredients(data)
			} else if (tab === 'proposals') {
				const data = await adminService.getPendingProposals()
				setProposals(data)
			}
		} catch {
			toast.error(t('admin.loadError'))
		} finally {
			setLoading(false)
		}
	}

	const handleRoleChange = async (user: AdminUser) => {
		const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN'
		const msg =
			newRole === 'ADMIN'
				? t('admin.confirmMakeAdmin', { name: user.name })
				: t('admin.confirmMakeUser', { name: user.name })
		const ok = await confirm({ title: t('confirm'), message: msg })
		if (!ok) return
		try {
			const updated = await adminService.setRole(user.id, newRole)
			setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, role: updated.role } : u)))
			toast.success(t('admin.roleChanged'))
		} catch {
			toast.error(t('admin.roleChangeError'))
		}
	}

	const handleDeleteUser = async (user: AdminUser) => {
		const ok = await confirm({
			title: t('admin.deleteUser'),
			message: t('admin.confirmDeleteUser', { name: user.name }),
		})
		if (!ok) return
		try {
			await adminService.deleteUser(user.id)
			setUsers((prev) => prev.filter((u) => u.id !== user.id))
			toast.success(t('admin.userDeleted'))
		} catch {
			toast.error(t('admin.deleteUserError'))
		}
	}

	const handleApproveIngredient = async (ing: PendingIngredient) => {
		try {
			await adminService.approveIngredient(ing.id)
			setPendingIngredients((prev) => prev.filter((i) => i.id !== ing.id))
			toast.success(t('admin.approved'))
		} catch {
			toast.error(t('admin.reviewError'))
		}
	}

	const handleRejectIngredient = async (ing: PendingIngredient) => {
		try {
			await adminService.rejectIngredient(ing.id)
			setPendingIngredients((prev) => prev.filter((i) => i.id !== ing.id))
			toast.success(t('admin.rejected'))
		} catch {
			toast.error(t('admin.reviewError'))
		}
	}

	const handleReviewProposal = async (proposal: Proposal, status: 'ACCEPTED' | 'REJECTED') => {
		try {
			await adminService.reviewProposal(proposal.id, status, adminNotes[proposal.id])
			setProposals((prev) => prev.filter((p) => p.id !== proposal.id))
			toast.success(status === 'ACCEPTED' ? t('admin.approved') : t('admin.rejected'))
		} catch {
			toast.error(t('admin.reviewError'))
		}
	}

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault()
		loadData()
	}

	return (
		<div className='admin-container container'>
			<h1 className='admin-container__title'>{t('admin.title')}</h1>

			<div className='admin-container__tabs'>
				{(['users', 'pendingIngredients', 'proposals'] as Tab[]).map((t2) => (
					<button
						key={t2}
						className={`admin-container__tab${tab === t2 ? ' admin-container__tab--active' : ''}`}
						onClick={() => setTab(t2)}>
						{t(`admin.tabs.${t2}`)}
						{t2 === 'pendingIngredients' && pendingIngredients.length > 0 && (
							<span className='admin-container__badge'>{pendingIngredients.length}</span>
						)}
						{t2 === 'proposals' && proposals.length > 0 && (
							<span className='admin-container__badge'>{proposals.length}</span>
						)}
					</button>
				))}
			</div>

			{loading ? (
				<p className='admin-container__loading'>{t('loading')}</p>
			) : (
				<>
					{/* TAB: USERS */}
					{tab === 'users' && (
						<div className='admin-container__section'>
							<p className='admin-container__desc'>{t('admin.usersDesc')}</p>
							<form className='admin-container__search-form' onSubmit={handleSearch}>
								<input
									type='text'
									placeholder={t('admin.searchUsers')}
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className='admin-container__search-input'
								/>
								<button type='submit' className='btn btn--secondary'>
									{t('search')}
								</button>
							</form>
							{users.length === 0 ? (
								<p className='admin-container__empty'>{t('admin.noData')}</p>
							) : (
								<table className='admin-container__table'>
									<thead>
										<tr>
											<th>ID</th>
											<th>{t('auth.name')}</th>
											<th>{t('auth.email')}</th>
											<th>{t('admin.status')}</th>
											<th>{t('admin.joinedAt')}</th>
											<th></th>
										</tr>
									</thead>
									<tbody>
										{users.map((user) => (
											<tr key={user.id}>
												<td>{user.id}</td>
												<td>{user.name}</td>
												<td>{user.email}</td>
												<td>
													<span
														className={`admin-container__role admin-container__role--${user.role.toLowerCase()}`}>
														{user.role === 'ADMIN' ? t('admin.roleAdmin') : t('admin.roleUser')}
													</span>
												</td>
												<td>{new Date(user.createdAt).toLocaleDateString()}</td>
												<td className='admin-container__actions'>
													<button
														className='btn btn--secondary btn--sm'
														onClick={() => handleRoleChange(user)}>
														{user.role === 'ADMIN' ? t('admin.makeUser') : t('admin.makeAdmin')}
													</button>
													<button
														className='btn btn--danger btn--sm'
														onClick={() => handleDeleteUser(user)}>
														{t('delete')}
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</div>
					)}

					{/* TAB: PENDING INGREDIENTS */}
					{tab === 'pendingIngredients' && (
						<div className='admin-container__section'>
							<p className='admin-container__desc'>{t('admin.pendingIngredientsDesc')}</p>
							{pendingIngredients.length === 0 ? (
								<p className='admin-container__empty'>{t('admin.noData')}</p>
							) : (
								<div className='admin-container__ing-list'>
									{pendingIngredients.map((ing) => (
										<div key={ing.id} className='admin-container__ing-row'>
											{ing.imageUrl ? (
												<img
													src={ing.imageUrl}
													alt={ing.name}
													className='admin-container__ing-thumb'
												/>
											) : (
												<div className='admin-container__ing-thumb admin-container__ing-thumb--placeholder' />
											)}
											<div className='admin-container__ing-info'>
												<button
													className='admin-container__ing-name'
													onClick={() => setSelectedIngredient(ing)}>
													{ing.name}
												</button>
												<div className='admin-container__ing-meta'>
													<span className='admin-container__pill admin-container__pill--unit'>
														{ing.unit}
													</span>
													{ing.defaultLocation && (
														<span className='admin-container__pill admin-container__pill--location'>
															{ing.defaultLocation}
														</span>
													)}
													{ing.variants.length > 0 && (
														<span className='admin-container__ing-variants'>
															{ing.variants.map((v) => v.name).join(', ')}
														</span>
													)}
												</div>
												{ing.createdBy && (
													<span className='admin-container__card-by'>
														{t('admin.proposedBy')}: {ing.createdBy.name}{' '}
														<span className='admin-container__card-email'>
															({ing.createdBy.email})
														</span>
													</span>
												)}
											</div>
											<div className='admin-container__ing-actions'>
												<button
													className='btn btn--secondary btn--sm'
													onClick={() => setSelectedIngredient(ing)}>
													{t('admin.viewDetail')}
												</button>
												<button
													className='btn btn--primary btn--sm'
													onClick={() => handleApproveIngredient(ing)}>
													{t('admin.approve')}
												</button>
												<button
													className='btn btn--danger btn--sm'
													onClick={() => handleRejectIngredient(ing)}>
													{t('admin.reject')}
												</button>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					)}

					{/* TAB: PROPOSALS */}
					{tab === 'proposals' && (
						<div className='admin-container__section'>
							<p className='admin-container__desc'>{t('admin.proposalsDesc')}</p>
							{proposals.length === 0 ? (
								<p className='admin-container__empty'>{t('admin.noData')}</p>
							) : (
								<div className='admin-container__cards'>
									{proposals.map((proposal) => {
										const isNewConv = proposal.type === 'NEW_CONVERSION'
										const proposedConv =
											isNewConv &&
											proposal.proposedValue &&
											typeof proposal.proposedValue === 'object'
												? (proposal.proposedValue as {
														unit?: string
														unitName?: string
														gramsEquivalent?: number
														gramsPerUnit?: number
													})
												: null
										return (
											<div
												key={proposal.id}
												className='admin-container__card admin-container__card--rich'>
												{/* Cabecera: info + nota + botones */}
												<div className='admin-container__card-top'>
													<div className='admin-container__card-title-block'>
														<div className='admin-container__card-pills'>
															<span className='admin-container__pill admin-container__pill--type'>
																{isNewConv
																	? t('admin.typeNewConversion')
																	: t('admin.typeEditField')}
															</span>
														</div>
														<h3 className='admin-container__card-name'>
															{proposal.ingredient.name}
														</h3>
														<span className='admin-container__card-by'>
															{t('admin.proposedBy')}: {proposal.proposedBy.name}{' '}
															<span className='admin-container__card-email'>
																({proposal.proposedBy.email})
															</span>
														</span>
													</div>
													<div className='admin-container__card-actions'>
														<input
															type='text'
															placeholder={t('admin.adminNote')}
															value={adminNotes[proposal.id] ?? ''}
															onChange={(e) =>
																setAdminNotes((prev) => ({
																	...prev,
																	[proposal.id]: e.target.value,
																}))
															}
															className='admin-container__note-input'
														/>
														<button
															className='btn btn--primary btn--sm'
															onClick={() => handleReviewProposal(proposal, 'ACCEPTED')}>
															{t('admin.approve')}
														</button>
														<button
															className='btn btn--danger btn--sm'
															onClick={() => handleReviewProposal(proposal, 'REJECTED')}>
															{t('admin.reject')}
														</button>
													</div>
												</div>

												{/* Detalle del cambio — ancho completo */}
												<div className='admin-container__card-section'>
													<span className='admin-container__card-section-label'>
														{t('admin.proposalDetail')}
													</span>
													{isNewConv && proposedConv ? (
														<div className='admin-container__proposal-conv'>
															<span className='admin-container__conversion admin-container__conversion--proposed'>
																1 {proposedConv.unit ?? proposedConv.unitName} ={' '}
																{proposedConv.gramsEquivalent ?? proposedConv.gramsPerUnit}g
															</span>
														</div>
													) : (
														<div className='admin-container__proposal-field'>
															{proposal.fieldName && (
																<span className='admin-container__proposal-row'>
																	<strong>{t('admin.field')}:</strong> {proposal.fieldName}
																</span>
															)}
															{proposal.currentValue != null && (
																<span className='admin-container__proposal-row'>
																	<strong>{t('admin.currentValue')}:</strong>{' '}
																	<span className='admin-container__value admin-container__value--old'>
																		{String(proposal.currentValue)}
																	</span>
																</span>
															)}
															<span className='admin-container__proposal-row'>
																<strong>{t('admin.proposedValue')}:</strong>{' '}
																<span className='admin-container__value admin-container__value--new'>
																	{typeof proposal.proposedValue === 'object'
																		? JSON.stringify(proposal.proposedValue)
																		: String(proposal.proposedValue ?? '')}
																</span>
															</span>
														</div>
													)}
												</div>
											</div>
										)
									})}
								</div>
							)}
						</div>
					)}
				</>
			)}

			{/* Modal de edición del ingrediente pendiente (reutiliza IngredientFormModal) */}
			<IngredientFormModal
				isOpen={!!selectedIngredient}
				onClose={() => setSelectedIngredient(null)}
				onSaved={() => {
					setSelectedIngredient(null)
					loadData()
				}}
				autoSaveOnClose
				readonlyName
				ingredient={
					selectedIngredient
						? {
								id: selectedIngredient.id,
								name: selectedIngredient.name,
								unit: selectedIngredient.unit,
								status: selectedIngredient.status,
								imageUrl: selectedIngredient.imageUrl,
								defaultLocation: selectedIngredient.defaultLocation,
								variants: selectedIngredient.variants,
								conversions: selectedIngredient.conversions.map((c) => ({
									...c,
									ingredientId: selectedIngredient.id,
								})),
							}
						: null
				}
			/>
		</div>
	)
}
