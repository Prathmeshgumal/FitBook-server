/**
 * Wraps an async Express route handler so that any thrown error
 * is forwarded to the next() error middleware instead of crashing.
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
