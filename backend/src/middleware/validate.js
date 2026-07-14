/**
 * Runs a zod schema against a chosen request source and replaces the field
 * with the parsed (and coerced) output so downstream code trusts its inputs.
 */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) return next(result.error);
  req[source] = result.data;
  next();
};
