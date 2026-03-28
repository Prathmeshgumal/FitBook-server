require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { config } = require('./config');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');

const app = express();

app.use(cors({ origin: config.originsList, credentials: true }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);

// Global error handler — 4 params required for Express to treat as error middleware
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const status = err.status || 500;
  const message = status >= 500 ? 'Internal server error' : err.message;
  res.status(status).json({ success: false, error: message });
});

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`FitBook API running on port ${config.port} [${config.appEnv}]`);
  });
}

module.exports = app;
