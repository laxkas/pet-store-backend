const app = require('./app');
const logger = require('./logger');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Pet Store API server running on port ${PORT}`);
  logger.info('server_started', { port: Number(PORT), hecEnabled: logger.hecEnabled });
});
