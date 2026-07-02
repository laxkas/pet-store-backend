const express = require('express');
const cors = require('cors');
const petRoutes = require('./routes/pets');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./logger');

const app = express();

app.use(cors());
app.use(express.json());

// Access logging -> stdout (CloudWatch) + Splunk HEC. Skip health checks to avoid noise.
app.use((req, res, next) => {
  if (req.path === '/api/health') return next();
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Math.round((Number(process.hrtime.bigint() - start) / 1e6) * 100) / 100;
    logger.info('request', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs,
    });
  });
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/pets', petRoutes);

// Global error handler — must be last middleware
app.use(errorHandler);

module.exports = app;
