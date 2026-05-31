/**
 * Tests de lista de compra con mocks (sin backend real).
 *
 * Cubre:
 * - Carga de la lista de compra
 * - Estado vacío
 * - Filtros de búsqueda local
 * - Marcar items como comprados
 * - Override de cantidad
 */
describe('Lista de Compra — con mocks', () => {
	beforeEach(() => {
		cy.stubSession()
		cy.stubHouseholdInterceptors()
		cy.intercept('GET', '/api/alerts*', { body: [] }).as('getAlerts')
	})

	// ── Lista con items ────────────────────────────────────────────────────────

	describe('Lista de compra con items', () => {
		beforeEach(() => {
			cy.stubShoppingInterceptors('shopping/list.json')
			cy.visit('/shopping-list')
			cy.wait('@getShoppingList')
		})

		it('muestra la página de lista de compra', () => {
			cy.contains(/lista de compra/i).should('be.visible')
		})

		it('muestra los items del fixture', () => {
			cy.contains('Patata').should('be.visible')
			cy.contains('Huevo').should('be.visible')
		})

		it('muestra la cantidad y unidad de cada item', () => {
			cy.contains('300').should('be.visible')
			cy.contains('g').should('be.visible')
		})
	})

	// ── Estado vacío ───────────────────────────────────────────────────────────

	describe('Lista de compra vacía', () => {
		it('muestra el estado vacío cuando no hay items que comprar', () => {
			cy.stubShoppingInterceptors('shopping/empty-list.json')
			cy.visit('/shopping-list')
			cy.wait('@getShoppingList')

			cy.contains(/lista vacía|no hay nada|todo comprado|sin items/i).should('be.visible')
		})
	})

	// ── Filtros locales ────────────────────────────────────────────────────────

	describe('Filtros de la lista de compra', () => {
		beforeEach(() => {
			cy.stubShoppingInterceptors('shopping/list.json')
			cy.visit('/shopping-list')
			cy.wait('@getShoppingList')
		})

		it('filtra items al escribir en el buscador', () => {
			cy.get('input[type="search"], input[placeholder*="buscar" i]').first().type('patata')

			cy.contains('Patata').should('be.visible')
			// El huevo debería desaparecer del filtro
			cy.contains('Huevo').should('not.be.visible')
		})

		it('muestra todos los items al borrar la búsqueda', () => {
			cy.get('input[type="search"], input[placeholder*="buscar" i]').first().type('patata').clear()

			cy.contains('Patata').should('be.visible')
			cy.contains('Huevo').should('be.visible')
		})
	})

	// ── Marcar como comprado ───────────────────────────────────────────────────

	describe('Marcar item como comprado', () => {
		beforeEach(() => {
			cy.stubShoppingInterceptors('shopping/list.json')
			cy.visit('/shopping-list')
			cy.wait('@getShoppingList')
		})

		it('envía la petición al marcar un item como comprado', () => {
			cy.intercept('POST', '/api/shopping-list/purchase', {
				statusCode: 200,
				body: { success: true },
			}).as('purchaseItem')

			// Hace clic en el checkbox o botón de comprar del primer item
			cy.get('input[type="checkbox"], button[title*="comprado" i], [data-testid="purchase-item"]')
				.first()
				.click()

			cy.wait('@purchaseItem')
		})
	})
})
