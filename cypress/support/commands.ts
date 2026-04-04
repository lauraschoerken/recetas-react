/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      login(email?: string, password?: string): Chainable<void>;
      logout(): Chainable<void>;
      registerAndLogin(name?: string): Chainable<{ email: string; password: string }>;
      cleanupUser(email: string): Chainable<void>;
      cleanupCurrentUser(): Chainable<void>;
      cleanupAllTestData(): Chainable<void>;
    }
  }
}

// Almacenar el email del usuario actual para limpieza
let currentTestUserEmail: string | null = null;

Cypress.Commands.add('login', (email = 'test@test.com', password = 'password123') => {
  cy.visit('/login');
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.get('button[type="submit"]').click();
  cy.url().should('not.include', '/login');
});

Cypress.Commands.add('logout', () => {
  cy.window().then((win) => {
    win.localStorage.removeItem('token');
    win.localStorage.removeItem('user');
  });
  cy.visit('/login');
});

Cypress.Commands.add('registerAndLogin', (name = 'Test User') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const email = `cypress_${timestamp}_${random}@test.com`;
  const password = 'password123';

  // Guardar email para limpieza posterior
  currentTestUserEmail = email;

  cy.visit('/register');
  cy.get('input[placeholder="Tu nombre"]').type(name);
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').first().type(password);
  cy.get('input[type="password"]').last().type(password);
  cy.get('button[type="submit"]').click();
  cy.url().should('not.include', '/register');

  return cy.wrap({ email, password });
});

Cypress.Commands.add('cleanupUser', (email: string) => {
  cy.task('cleanupUser', email).then((result: any) => {
    if (result.error) {
      cy.log(`Cleanup warning: ${result.error}`);
    } else {
      cy.log(`Cleanup: ${result.message}`);
    }
  });
});

Cypress.Commands.add('cleanupCurrentUser', () => {
  if (currentTestUserEmail) {
    cy.task('cleanupUser', currentTestUserEmail).then((result: any) => {
      if (result.success) {
        cy.log(`Cleaned up: ${currentTestUserEmail}`);
      }
      currentTestUserEmail = null;
    });
  }
});

Cypress.Commands.add('cleanupAllTestData', () => {
  cy.task('cleanupAllTestData').then((result: any) => {
    if (result.error) {
      cy.log(`Cleanup warning: ${result.error}`);
    } else {
      cy.log(`Cleanup: ${result.message}`);
    }
  });
});

// Exportar función para obtener el email actual (uso interno)
export function getCurrentTestUserEmail(): string | null {
  return currentTestUserEmail;
}

export function setCurrentTestUserEmail(email: string | null): void {
  currentTestUserEmail = email;
}

export {};
