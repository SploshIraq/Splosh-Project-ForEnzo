const path = require('path');
const { Database } = require('st.db');

module.exports = new Database(
	path.join(__dirname, 'Json-db', 'Bots', 'ticketDB.json'),
	{ pathOutsideTheProject: true },
);