const postgres = require('postgres');
const { config } = require('./config');

// max: 1 is intentional — each Vercel serverless function instance handles
// one request at a time, so a single connection per instance is correct.
// Traditional servers should use a higher value (e.g. 10).
const sql = postgres(config.databaseUrl, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: config.appEnv !== 'test' ? 'require' : false,
});

module.exports = sql;
