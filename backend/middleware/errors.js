'use strict';
// Serialize API and JSON parsing errors without changing response contracts.
/**
 * Create a client-facing HTTP error.
 * @param {number} status
 * @param {string} message
 * @returns {Error}
 */
const httpError = (status, message) => Object.assign(new Error(message), { status });
/**
 * Serialize API errors without exposing server internals.
 * @param {object} res
 * @param {string} route
 * @param {Error} error
 * @returns {object}
 */
function sendError(res, route, error) {
  if (Number.isInteger(error.status) && error.status >= 400 && error.status < 500) {
    return res.status(error.status).json({ error: error.message });
  }
  console.error(`API ${route}:`, error.message); // No user tokens / credentials / records
  return res.status(500).json({ error: 'Internal server error' });
}
/**
 * Return the standard JSON 404 response.
 * @param {object} req
 * @param {object} res
 * @returns {object}
 */
function notFound(_req, res) { return res.status(404).json({ error: 'Route not found' }); }
/**
 * Handle JSON parsing errors and unexpected middleware failures.
 * @param {Error} err
 * @param {object} req
 * @param {object} res
 * @param {Function} next
 * @returns {object}
 */
function errorHandler(err, _req, res, _next) {
  if (err.type === 'entity.parse.failed')
    return res.status(400).json({ error: 'Invalid JSON body' });
  if (err.type === 'entity.too.large')
    return res.status(413).json({ error: 'Request body too large' });
  if (Number.isInteger(err.status) && err.status >= 400 && err.status < 500)
    return res.status(err.status).json({ error: err.expose ? err.message : 'Invalid request' });
  return sendError(res, 'request handling', err);
}
module.exports = { httpError, sendError, notFound, errorHandler };
