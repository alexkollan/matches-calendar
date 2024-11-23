const crypto = require('crypto');

/**
 * Creates a SHA-256 hash of an object.
 * @param {Object} obj - The object to hash.
 * @returns {string} - The hash value.
 */
function createHash(obj) {
    const serialized = JSON.stringify(obj, Object.keys(obj).sort());
    return crypto.createHash('sha256').update(serialized).digest('hex');
}

module.exports = { createHash };
