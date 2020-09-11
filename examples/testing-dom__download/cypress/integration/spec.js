/// <reference types="cypress" />
const neatCSV = require('neat-csv')
const path = require('path')

describe('file download', () => {
  // with respect to the current working folder
  const downloadsFolder = 'cypress/downloads'

  beforeEach(() => {
    cy.task('clearDownloads')

    // The next command allow downloads in Electron, Chrome, and Edge
    // without any users popups or file save dialogs.
    if (Cypress.browser.name !== 'firefox') {
      // since this call returns a promise, must tell Cypress to wait
      // for it to be resolved
      cy.wrap(
        Cypress.automation('remote:debugger:protocol',
          {
            command: 'Page.setDownloadBehavior',
            params: { behavior: 'allow', downloadPath: downloadsFolder },
          }),
        { log: false }
      )
    }
  })

  it('downloads CSV file', () => {
    cy.visit('/')
    cy.contains('h1', 'Download CSV')
    cy.get('[data-cy=download-csv]').click()

    cy.log('**read downloaded file**')

    // file path is relative to the working folder
    const filename = path.join(downloadsFolder, 'records.csv')

    // browser might take a while to download the file,
    // so use "cy.readFile" to retry until the file exists
    // and has length - and we assume that it has finished downloading then
    cy.readFile(filename, { timeout: 15000 })
    .should('have.length.gt', 50)
    // parse CSV text into objects
    .then(neatCSV)
    .then((list) => {
      expect(list, 'number of records').to.have.length(3)
      expect(list[0], 'first record').to.deep.equal({
        Age: '20',
        City: 'Boston',
        'First name': 'Joe',
        'Last name': 'Smith',
        Occupation: 'student',
        State: 'MA',
      })
    })
  })

  it('downloads Excel file', () => {
    // let's download a binary file

    cy.visit('/')
    cy.contains('h1', 'Download XLSX')
    cy.get('[data-cy=download-xlsx]').click()

    cy.log('**confirm downloaded file**')

    const downloadedFilename = path.join(downloadsFolder, 'people.xlsx')

    // ensure the file has been saved before trying to parse it
    cy.readFile(downloadedFilename, 'binary', { timeout: 15000 })
    .should((buffer) => {
      // by having length assertion we ensure the file has text
      // since we don't know when the browser finishes writing it to disk

      // Tip: use expect() form to avoid dumping binary contents
      // of the buffer into the Command Log
      expect(buffer.length).to.be.gt(100)
    })

    cy.log('**the file exists**')

    // the first utility library we use to parse Excel files
    // only works in Node, thus we can read and parse
    // the downloaded file using cy.task
    cy.task('readExcelFile', downloadedFilename)
    // returns an array of lines read from Excel file
    .should('have.length', 4)
    .then((list) => {
      expect(list[0], 'header line').to.deep.equal([
        'First name', 'Last name', 'Occupation', 'Age', 'City', 'State',
      ])

      expect(list[1], 'first person').to.deep.equal([
        'Joe', 'Smith', 'student', 20, 'Boston', 'MA',
      ])
    })
  })
})
