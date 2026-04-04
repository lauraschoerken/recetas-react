describe('Week Plan', () => {
  beforeEach(() => {
    cy.registerAndLogin();
  });

  describe('Week Plan View', () => {
    beforeEach(() => {
      cy.visit('/week-plan');
    });

    it('should display week plan page', () => {
      cy.contains('Plan Semanal').should('be.visible');
    });

    it('should navigate between weeks', () => {
      cy.contains('Anterior').click();
      cy.wait(500);
      cy.contains('Siguiente').click();
      cy.wait(500);
      cy.contains('Hoy').click();
    });

    it('should show add recipe button', () => {
      cy.contains('Añadir receta').should('be.visible');
    });
  });

  describe('Add to Week Plan', () => {
    it('should add recipe to week plan', () => {
      const timestamp = Date.now();
      
      cy.visit('/recipes/new');
      cy.get('input[placeholder*="Tortilla"]').type(`WeekPlanTest${timestamp}`);
      cy.get('.ingredients-table-row input[placeholder="Nombre del ingrediente"]').first().type('TestIngredient');
      cy.get('.ingredients-table-row input[type="number"]').first().clear().type('100');
      cy.get('button[type="submit"]').click();
      
      cy.url().should('include', '/recipes');
      cy.url().should('not.include', '/new');
      
      cy.contains(`WeekPlanTest${timestamp}`).parents('.recipe-card').first().within(() => {
        cy.get('button[title="Añadir a la semana"]').click();
      });
      
      cy.get('.modal-overlay').should('be.visible');
      cy.contains('Añadir al plan semanal').should('be.visible');
      
      cy.get('.modal-overlay').within(() => {
        cy.get('button.btn-primary').contains('Añadir').click();
      });
      
      cy.get('.toast').should('be.visible');
    });
  });

  describe('Shopping List', () => {
    it('should navigate to shopping list', () => {
      cy.visit('/shopping-list');
      cy.url().should('include', '/shopping-list');
    });
  });
});
