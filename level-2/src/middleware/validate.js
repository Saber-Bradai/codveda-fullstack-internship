const HttpError = require('../utils/HttpError');

// Validates req[source] against a zod schema *before* anything touches the database.
const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source] ?? {});
  if (!result.success) {
    const details = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      details[key] ??= issue.message;
    }
    throw new HttpError(422, 'Validation failed', details);
  }
  if (source === 'query') req.validatedQuery = result.data; // req.query is read-only in Express 5
  else req[source] = result.data;
  next();
};

module.exports = validate;
