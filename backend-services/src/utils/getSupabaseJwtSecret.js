/**
 * Helper function to get the Supabase JWT Secret from environment variables.
 * 
 * This function checks for both the correct name (SUPABASE_JWT_SECRET) and
 * common misspellings (e.g., SUPABASE_JWT_SECRE) to provide flexibility.
 * 
 * Supabase JWT secrets are base64-encoded strings. This function validates
 * the format and ensures proper trimming to handle any whitespace issues.
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
      const trimmedValue = value.trim();
      
      // Validate base64 format (Supabase JWT secrets are base64-encoded)
      const base64Regex = /^[A-Za-z0-9+/=]+$/;
      if (!base64Regex.test(trimmedValue)) {
        const logger = require('./logger');
        logger.warn(
          `Supabase JWT Secret from '${varName}' contains invalid characters. ` +
          `Expected base64-encoded string. Length: ${trimmedValue.length}`
        );
        // Still return it - let jwt.verify handle the validation
      }
      
      // Log warning if using alternative name (but only in production)
      if (varName !== 'SUPABASE_JWT_SECRET' && process.env.NODE_ENV === 'production') {
        const logger = require('./logger');
        logger.warn(
          `Using alternative environment variable name '${varName}' for Supabase JWT Secret. ` +
          `Consider renaming it to 'SUPABASE_JWT_SECRET' for consistency.`
        );
      }
      
      // Log secret length for debugging (without exposing the actual secret)
      if (process.env.NODE_ENV === 'production') {
        const logger = require('./logger');
        logger.debug(`Supabase JWT Secret loaded from '${varName}', length: ${trimmedValue.length} characters`);
      }
      
      return trimmedValue;
    }
  }

  return undefined;
}

module.exports = { getSupabaseJwtSecret };

