describe('Recipes', () => {
	beforeEach(() => {
		cy.registerAndLogin()
		cy.visit('/recipes')
	})

	describe('Recipe List', () => {
		it('should display recipes page', () => {
			cy.contains('Mis Recetas').should('be.visible')
			cy.contains('Nueva Receta').should('be.visible')
		})

		it('should navigate to new recipe form', () => {
			cy.contains('Nueva Receta').click()
			cy.url().should('include', '/recipes/new')
		})
	})

	describe('Create Recipe', () => {
		beforeEach(() => {
			cy.visit('/recipes/new')
		})

		it('should display recipe form', () => {
			cy.get('input[placeholder*="Tortilla"]').should('be.visible')
			cy.get('textarea').should('exist')
		})

		it('should create a new recipe', () => {
			const timestamp = Date.now()

			cy.get('input[placeholder*="Tortilla"]').type(`TestRecipe${timestamp}`)
			cy.get('textarea').first().type('Test description')

			cy.get('.ingredients-table-row input[placeholder="Nombre del ingrediente"]')
				.first()
				.type('Tomate')
			cy.get('.ingredients-table-row input[type="number"]').first().clear().type('100')

			cy.get('button[type="submit"]').click()

			cy.url().should('include', '/recipes')
			cy.url().should('not.include', '/new')
			cy.contains(`TestRecipe${timestamp}`).should('be.visible')
		})

		it('should show validation error without title', () => {
			cy.get('button[type="submit"]').click()
			cy.url().should('include', '/recipes/new')
		})
	})

	describe('Edit Recipe', () => {
		it('should edit an existing recipe', () => {
			const timestamp = Date.now()

			cy.visit('/recipes/new')
			cy.get('input[placeholder*="Tortilla"]').type(`EditTest${timestamp}`)
			cy.get('.ingredients-table-row input[placeholder="Nombre del ingrediente"]')
				.first()
				.type('TestIngredient')
			cy.get('.ingredients-table-row input[type="number"]').first().clear().type('100')
			cy.get('button[type="submit"]').click()

			cy.url().should('include', '/recipes')
			cy.url().should('not.include', '/new')

			cy.contains(`EditTest${timestamp}`)
				.parents('.recipe-card')
				.first()
				.within(() => {
					cy.get('a[title="Editar"]').click()
				})

			cy.url().should('include', '/edit')

			cy.get('input[placeholder*="Tortilla"]').clear().type(`UpdatedRecipe${timestamp}`)
			cy.get('button[type="submit"]').click()

			cy.contains(`UpdatedRecipe${timestamp}`).should('be.visible')
		})
	})

	describe('Delete Recipe', () => {
		it('should delete a recipe', () => {
			const timestamp = Date.now()

			cy.visit('/recipes/new')
			cy.get('input[placeholder*="Tortilla"]').type(`DeleteTest${timestamp}`)
			cy.get('.ingredients-table-row input[placeholder="Nombre del ingrediente"]')
				.first()
				.type('Test')
			cy.get('.ingredients-table-row input[type="number"]').first().clear().type('100')
			cy.get('button[type="submit"]').click()

			cy.url().should('include', '/recipes')
			cy.contains(`DeleteTest${timestamp}`).should('be.visible')

			cy.contains(`DeleteTest${timestamp}`)
				.parents('.recipe-card')
				.first()
				.within(() => {
					cy.get('button[title="Eliminar"]').click()
				})

			cy.get('.confirm-dialog-overlay').should('be.visible')
			cy.get('.confirm-dialog-overlay button').contains('Eliminar').click()

			cy.get('.toast').should('contain', 'eliminada')
		})
	})
})
