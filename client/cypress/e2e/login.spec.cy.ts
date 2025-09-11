describe('template spec', () => {
  it('passes', () => {
    cy.visit('http://localhost:5173/login')
    cy.contains('Log in.')
    cy.get('#login_email').type('docente@example.com')
    cy.get('#login_password').type('password123')
    cy.get('button[type="submit"]').click()
    cy.url().should('include', '/exams')
  })
})