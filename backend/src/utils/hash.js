import crypto from 'crypto';

/**
 * Create a hash for unique identification
 * @param {string} input - Input string to hash
 * @returns {string} - Hex hash
 */
export function createHash(input) {
  return crypto.createHash('md5').update(input).digest('hex');
}
