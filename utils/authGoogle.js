const { GoogleSpreadsheet } = require('google-spreadsheet');
const { GoogleAuth } = require('google-auth-library');
const path = require('path');

const auth = new GoogleAuth({
  keyFile: path.join(__dirname, '../idea-analyzer-6172a228a616.json'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const doc = new GoogleSpreadsheet(
  '1_D1wftVoy-T8ZD_uFnxF9j_oTXrGNbzTdgEq9LP1Xgo',
  auth
);

module.exports = {
  doc,
};
