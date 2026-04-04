describe('Home (Storage)', () => {
	beforeEach(() => {
		cy.registerAndLogin()
		cy.visit('/home')
	})

	describe('Home View', () => {
		it('should display home storage page', () => {
			cy.contains('Mi Casa').should('be.visible')
		})

		it('should show location tabs', () => {
			cy.contains('Nevera').should('be.visible')
			cy.contains('Congelador').should('be.visible')
			cy.contains('Despensa').should('be.visible')
		})

		it('should switch between tabs', () => {
			cy.contains('Congelador').click()
			cy.get('.home-tab.active').should('contain', 'Congelador')

			cy.contains('Despensa').click()
			cy.get('.home-tab.active').should('contain', 'Despensa')

			cy.contains('Nevera').click()
			cy.get('.home-tab.active').should('contain', 'Nevera')
		})
	})

	describe('Add Items', () => {
		it('should show add item form', () => {
			cy.contains('Añadir a Nevera').click()
			cy.get('form').should('be.visible')
		})

		it('should add a new item to nevera', () => {
			const timestamp = Date.now()
			cy.contains('Añadir a Nevera').click()

			cy.get('input[placeholder="Nombre del ingrediente"]').type(`TestItem${timestamp}`)
			cy.get('input.qty-input').clear().type('500')

			cy.get('button[type="submit"]').contains('Añadir').click()

			cy.get('.toast').should('be.visible')
		})
	})

	describe('Delete Items', () => {
		it('should delete an item from storage', () => {
			const timestamp = Date.now()

			cy.contains('Añadir a Nevera').click()
			cy.get('input[placeholder="Nombre del ingrediente"]').type(`DeleteItem${timestamp}`)
			cy.get('input.qty-input').clear().type('100')
			cy.get('button[type="submit"]').contains('Añadir').click()

			cy.get('.toast').should('be.visible')
			cy.wait(1000)

			cy.get('.home-item-card')
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
