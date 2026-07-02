'use strict';
// Structured logger for the Pet Store backend.
// Writes JSON to stdout (captured by CloudWatch via the awslogs driver) and, when
// configured, also ships each event to Splunk via the HTTP Event Collector (HEC).
//
// Environment variables (HEC shipping is skipped unless URL + token are set):
//   SPLUNK_HEC_URL     e.g. https://3.95.251.132:8088/services/collector
//   SPLUNK_HEC_TOKEN   HEC token value
//   SPLUNK_INDEX       target index (default: main)
//   SPLUNK_SOURCETYPE  sourcetype (default: pet-store)
//   SERVICE_NAME       service name attached to every event (default: pet-store-backend)
const https = require('https');
const http = require('http');
const { URL } = require('url');

const HEC_URL = process.env.SPLUNK_HEC_URL || '';
const HEC_TOKEN = process.env.SPLUNK_HEC_TOKEN || '';
const INDEX = process.env.SPLUNK_INDEX || 'main';
const SOURCETYPE = process.env.SPLUNK_SOURCETYPE || 'pet-store';
const SERVICE = process.env.SERVICE_NAME || 'pet-store-backend';

const hecEnabled = Boolean(HEC_URL && HEC_TOKEN);

// Splunk HEC uses a self-signed cert in this demo; do not disable verification in prod.
const insecureAgent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });

function shipToSplunk(record) {
  if (!hecEnabled) return;
  let target;
  try {
    target = new URL(HEC_URL);
  } catch (e) {
    return;
  }
  const body = JSON.stringify({
    time: Date.now() / 1000,
    host: process.env.HOSTNAME || 'ecs-task',
    source: SERVICE,
    sourcetype: SOURCETYPE,
    index: INDEX,
    event: record,
  });
  const isHttps = target.protocol === 'https:';
  const lib = isHttps ? https : http;
  const req = lib.request(
    {
      hostname: target.hostname,
      port: target.port || (isHttps ? 443 : 80),
      path: target.pathname || '/services/collector',
      method: 'POST',
      agent: isHttps ? insecureAgent : undefined,
      timeout: 3000,
      headers: {
        Authorization: `Splunk ${HEC_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    },
    (res) => res.resume() // drain and ignore HEC response body
  );
  // Best-effort: never let logging break the request path.
  req.on('error', (err) => {
    process.stdout.write(
      JSON.stringify({ level: 'warn', service: SERVICE, msg: 'splunk_hec_send_failed', error: err.message }) + '\n'
    );
  });
  req.on('timeout', () => req.destroy());
  req.write(body);
  req.end();
}

function log(level, msg, fields) {
  const record = Object.assign(
    {
      timestamp: new Date().toISOString(),
      level,
      service: SERVICE,
      msg,
    },
    fields || {}
  );
  process.stdout.write(JSON.stringify(record) + '\n');
  shipToSplunk(record);
}

module.exports = {
  info: (msg, fields) => log('info', msg, fields),
  warn: (msg, fields) => log('warn', msg, fields),
  error: (msg, fields) => log('error', msg, fields),
  hecEnabled,
};
