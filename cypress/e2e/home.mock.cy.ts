/**
 * Tests de almacenamiento (home) con mocks (sin backend real).
 *
 * Cubre:
 * - Carga del inventario
 * - Cambio entre tabs de ubicación (nevera/congelador/despensa)
 * - Estado vacío
 * - Añadir item
 * - Eliminar item
 */
describe('Almacenamiento (Home) — con mocks', () => {
	beforeEach(() => {
		cy.stubSession()
		cy.stubHouseholdInterceptors()
		cy.intercept('GET', '/api/alerts*', { body: [] }).as('getAlerts')
		cy.intercept('GET', '/api/ingredient-tags*', { body: [] }).as('getTags')
	})

	// ── Vista del almacenamiento ───────────────────────────────────────────────

	describe('Vista del almacenamiento', () => {
		beforeEach(() => {
			cy.stubHomeInterceptors('home/items.json')
			cy.visit('/home')
			cy.wait('@getHomeItems')
		})

		it('muestra la página de almacenamiento', () => {
			cy.contains(/mi casa|almacenamiento|nevera/i).should('be.visible')
		})

		it('muestra los tabs de ubicación', () => {
			cy.contains(/nevera/i).should('be.visible')
			cy.contains(/congelador/i).should('be.visible')
			cy.contains(/despensa/i).should('be.visible')
		})

		it('muestra los items de la nevera por defecto', () => {
			// La nevera es la ubicación por defecto y tiene Patata + Huevo
			cy.contains('Patata').should('be.visible')
			cy.contains('Huevo').should('be.visible')
		})
	})

	// ── Cambio de tabs ─────────────────────────────────────────────────────────

	describe('Cambio entre tabs de ubicación', () => {
		beforeEach(() => {
			cy.stubHomeInterceptors('home/items.json')
			cy.visit('/home')
			cy.wait('@getHomeItems')
		})

		it('cambia al tab de Congelador', () => {
			cy.contains(/congelador/i).click()
			cy.get('.home-tab.active, [data-testid="active-tab"]').should('contain.text', 'Congelador')
		})

		it('muestra el item del congelador al cambiar de tab', () => {
			cy.contains(/congelador/i).click()
			cy.contains('Lechuga').should('be.visible')
		})

		it('cambia al tab de Despensa', () => {
			cy.contains(/despensa/i).click()
			cy.get('.home-tab.active, [data-testid="active-tab"]').should('contain.text', 'Despensa')
		})

		it('vuelve a la Nevera al hacer clic en su tab', () => {
			cy.contains(/congelador/i).click()
			cy.contains(/nevera/i).click()
			cy.contains('Patata').should('be.visible')
		})
	})

	// ── Estado vacío ───────────────────────────────────────────────────────────

	describe('Estado vacío', () => {
		it('muestra estado vacío cuando no hay items', () => {
			cy.stubHomeInterceptors('home/empty-items.json')
			cy.visit('/home')
			cy.wait('@getHomeItems')

			cy.contains(/vacía|vacío|sin items|no hay nada/i).should('be.visible')
		})
	})

	// ── Añadir item ────────────────────────────────────────────────────────────

	describe('Añadir item al almacenamiento', () => {
		beforeEach(() => {
			cy.stubHomeInterceptors('home/items.json')
			cy.visit('/home')
			cy.wait('@getHomeItems')
		})

		it('muestra el formulario al hacer clic en añadir', () => {
			cy.contains(/añadir/i)
				.first()
				.click()
			cy.get('form, [role="dialog"]').should('be.visible')
		})

		it('añade un item y muestra toast de éxito', () => {
			const newItem = {
				id: 99,
				location: 'nevera',
				quantity: 200,
				unit: 'g',
				addedAt: '2024-01-01T00:00:00.000Z',
				expiresAt: null,
				userId: 1,
				ingredientId: 1,
				productId: null,
				ingredient: { id: 1, name: 'Patata', unit: 'g', imageUrl: null },
				product: null,
				variant: null,
			}

			cy.intercept('POST', '/api/home', { body: newItem, statusCode: 201 }).as('createItem')
			cy.intercept('GET', '/api/home*', { body: [newItem] }).as('getHomeRefresh')

			cy.contains(/añadir/i)
				.first()
				.click()

			cy.get('input[placeholder*="Nombre del ingrediente" i], input[placeholder*="nombre" i]').type(
				'Patata'
			)

			cy.get('input.qty-input, input[type="number"]').first().clear().type('200')

			cy.get('button[type="submit"]')
				.contains(/añadir/i)
				.click()

			cy.wait('@createItem')
			cy.get('.toast').should('be.visible')
		})
	})

	// ── Eliminar item ──────────────────────────────────────────────────────────

	describe('Eliminar item del almacenamiento', () => {
		beforeEach(() => {
			cy.stubHomeInterceptors('home/items.json')
			cy.visit('/home')
			cy.wait('@getHomeItems')
		})

		it('elimina un item tras confirmar', () => {
			cy.intercept('DELETE', '/api/home/1', { statusCode: 204, body: {} }).as('deleteItem')
			cy.intercept('GET', '/api/home*', { body: [] }).as('getHomeEmpty')

			cy.get('button[title="Eliminar"], button[aria-label="Eliminar"], [data-testid="delete-item"]')
				.first()
				.click()

			// Si hay diálogo de confirmación
			cy.get('body').then(($body) => {
				if ($body.find('.confirm-dialog-overlay').length > 0) {
					cy.get('.confirm-dialog-overlay button')
						.contains(/eliminar|confirmar/i)
						.click()
				}
			})

			cy.wait('@deleteItem')
			cy.get('.toast').should('be.visible')
		})
	})
})
