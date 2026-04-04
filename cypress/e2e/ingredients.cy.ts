describe('Ingredients', () => {
	beforeEach(() => {
		cy.registerAndLogin()
		cy.visit('/ingredients')
	})

	describe('Ingredient List', () => {
		it('should display ingredients page', () => {
			cy.contains('Ingredientes').should('be.visible')
			cy.contains('Nuevo Ingrediente').should('be.visible')
		})
	})

	describe('Create Single Ingredient', () => {
		it('should create a new ingredient', () => {
			const timestamp = Date.now()

			cy.contains('Nuevo Ingrediente').click()
			cy.get('input[placeholder*="Nombre del ingrediente"]').type(`Ingredient${timestamp}`)
			cy.contains('Crear Ingrediente').click()

			cy.get('.toast').should('be.visible')
			cy.contains(`Ingredient${timestamp}`, { matchCase: false }).should('be.visible')
		})

		it('should create ingredient with macros', () => {
			const timestamp = Date.now()

			cy.contains('Nuevo Ingrediente').click()
			cy.get('input[placeholder*="Nombre del ingrediente"]').type(`MacroTest${timestamp}`)

			cy.get('.macro-input input').first().type('100')

			cy.contains('Crear Ingrediente').click()

			cy.get('.toast').should('be.visible')
			cy.contains(`MacroTest${timestamp}`, { matchCase: false }).should('be.visible')
		})
	})

	describe('Create Multiple Ingredients (Bulk)', () => {
		it('should switch to bulk mode', () => {
			cy.contains('Nuevo Ingrediente').click()
			cy.contains('Varios ingredientes').click()

			cy.contains('Añadir otro ingrediente').should('be.visible')
		})

		it('should create multiple ingredients at once', () => {
			const timestamp = Date.now()

			cy.contains('Nuevo Ingrediente').click()
			cy.contains('Varios ingredientes').click()

			cy.get('.bulk-ingredient-row input[type="text"]').first().type(`Bulk1${timestamp}`)

			cy.contains('Añadir otro ingrediente').click()
			cy.get('.bulk-ingredient-row input[type="text"]').last().type(`Bulk2${timestamp}`)

			cy.contains('Crear 2 ingrediente(s)').click()

			cy.get('.toast').should('be.visible')
			cy.contains(`Bulk1${timestamp}`, { matchCase: false }).should('be.visible')
			cy.contains(`Bulk2${timestamp}`, { matchCase: false }).should('be.visible')
		})

		it('should add new row on Enter key', () => {
			cy.contains('Nuevo Ingrediente').click()
			cy.contains('Varios ingredientes').click()

			cy.get('.bulk-ingredient-row input[type="text"]').first().type('First{enter}')

			cy.get('.bulk-ingredient-row').should('have.length', 2)
		})
	})

	describe('Search Ingredients', () => {
		it('should filter ingredients by search term', () => {
			const timestamp = Date.now()

			cy.contains('Nuevo Ingrediente').click()
			cy.get('input[placeholder*="Nombre del ingrediente"]').type(`SearchTest${timestamp}`)
			cy.contains('Crear Ingrediente').click()

			cy.get('.toast').should('be.visible')
			cy.wait(500)

			cy.get('input[placeholder*="Buscar"]').type('SearchTest')
			cy.contains(`SearchTest${timestamp}`, { matchCase: false }).should('be.visible')

			cy.get('input[placeholder*="Buscar"]').clear().type('zzzznonexistent')
			cy.contains(`SearchTest${timestamp}`, { matchCase: false }).should('not.exist')
		})
	})

	describe('Delete Ingredient', () => {
		it('should delete an ingredient', () => {
			const timestamp = Date.now()

			cy.contains('Nuevo Ingrediente').click()
			cy.get('input[placeholder*="Nombre del ingrediente"]').type(`ToDelete${timestamp}`)
			cy.contains('Crear Ingrediente').click()

			cy.get('.toast').should('be.visible')
			cy.wait(500)

			cy.contains(`ToDelete${timestamp}`, { matchCase: false })
				.parents('.ingredient-card')
				.first()
				.within(() => {
					cy.get('button[title="Eliminar"]').click()
				})

			cy.get('.confirm-dialog-overlay').within(() => {
				cy.contains('Eliminar').click()
			})

			cy.get('.toast').should('be.visible')
		})
	})
})
