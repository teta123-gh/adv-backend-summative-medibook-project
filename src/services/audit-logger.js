const fs = require('node:fs/promises');
const path = require('node:path');

const logFile = path.join(process.cwd(), 'logs', 'audit.log');

async function appendAuditEvent(event) {
  try {
    await fs.mkdir(path.dirname(logFile), { recursive: true });
    await fs.appendFile(logFile, `${JSON.stringify(event)}\n`, 'utf8');
  } catch (error) {
    // Audit logging is best-effort and must never fail a successful request.
    console.error('Unable to append audit event:', error.message);
  }
}

module.exports = { appendAuditEvent };
