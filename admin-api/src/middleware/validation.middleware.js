import logger from '../utils/logger.js';
export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    logger.info(
      'Zod validation failed details:',
      JSON.stringify(error.errors || error.issues || error)
    );
    return res.status(400).json({
      error: 'Validation failed',
      details: error.errors || error.issues || [],
    });
  }
};
