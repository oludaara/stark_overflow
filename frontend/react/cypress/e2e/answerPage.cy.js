describe('Answer Page', () => {
  beforeEach(() => {
    cy.visit('/answer/1'); // Assuming question ID 1
    cy.window().then((win) => {
      win.localStorage.setItem('wallet', JSON.stringify({ address: '0xQuestionAuthorAddress' })); // Mock question author
    });
  });

  it('should allow question author to mark an answer as correct', () => {
    cy.get('button').contains('Mark as Correct').first().click();
    cy.get('[data-testid="status-message"]').should('contain', 'Processing transaction...');
    cy.get('[data-testid="status-message"]').should('contain', 'Answer marked as correct and rewards distributed!');
    cy.get('[data-testid="correct-badge"]').should('exist');
    cy.get('button').contains('Mark as Correct').should('not.exist');
  });

  it('should prevent non-author from marking an answer', () => {
    cy.window().then((win) => {
      win.localStorage.setItem('wallet', JSON.stringify({ address: '0xNonAuthorAddress' }));
    });
    cy.reload();
    cy.get('button').contains('Mark as Correct').should('not.exist');
  });
});