const { Pool } = require('pg');
const { dbConfig } = require('./config');

const pool = new Pool(dbConfig);

pool.connect((err, client, release) => {
  if (err) {
    console.error('Error acquiring client', err.stack);
    process.exit(1);  // Exit with error
  }
  client.query('SELECT NOW()', (err, result) => {
    release();
    if (err) {
      console.error('Error executing query', err.stack);
      process.exit(1);  // Exit with error
    }
    console.log(result.rows);
    process.exit(0);  // Exit with success
  });
});
