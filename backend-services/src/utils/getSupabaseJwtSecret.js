/**
 * Helper function to get the Supabase JWT Secret from environment variables.
 * 
 * This function checks for both the correct name (SUPABASE_JWT_SECRET) and
 * common misspellings (e.g., SUPABASE_JWT_SECRE) to provide flexibility.
 * 
 * @returns {string|undefined} The Supabase JWT Secret value, or undefined if not found
 */
function getSupabaseJwtSecret() {
  // Priority order: Check correct name first, then alternatives
  const possibleNames = [
    'SUPABASE_JWT_SECRET',  // Correct name
    'SUPABASE_JWT_SECRE',   // Common misspelling (missing T)
    'SUPABASE_JWT',         // Alternative shorter name
    'JWT_SECRET_SUPABASE',  // Alternative order
    'SUPABASE_SECRET'       // Alternative shorter name
  ];

  for (const varName of possibleNames) {
    const value = process.env[varName];
    if (value && value.trim().length > 0) {
      // Log warning if using alternative name (but only in production)
      if (varName !== 'SUPABASE_JWT_SECRET' && process.env.NODE_ENV === 'production') {
        const logger = require('./logger');
        logger.warn(
          `Using alternative environment variable name '${varName}' for Supabase JWT Secret. ` +
          `Consider renaming it to 'SUPABASE_JWT_SECRET' for consistency.`
        );
      }
      return value.trim();
    }
  }

  return undefined;
}

module.exports = { getSupabaseJwtSecret };

