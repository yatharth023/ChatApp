/**
 * Wraps an async Express handler and forwards rejections to next().
 * Removes try/catch boilerplate from every controller.
 */
export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};
