

/**
 * @returns {String}
 */
function getTime() {
    const date = new Date()

    return `${date.getSeconds()}-${date.getMilliseconds()}`
}


module.exports = {getTime}