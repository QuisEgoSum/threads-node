const crypto = require('crypto')


/**
 * @returns {String}
 */
const createId = () => crypto.randomBytes(16).toString('hex')

/**
 * @param {Number} min 
 * @param {Number} max 
 */
const randomInt = (max = 1, min = 0) => Math.abs(Math.round(min - 0.5 + Math.random() * (max - min + 1)))


module.exports = {
    createId,
    randomInt
}