const Channel = require('./Channel')


/**
 * @typedef Addressees
 * @type {Object}
 * @property {String} name
 * @property {Array.<Number>} numbers
 * 
 * @typedef ChannelNodeConstuctorOptions
 * @type {Object}
 * @property {import('./MainThread').OptionsDelay} delay
 * @property {import('./Thread')} root
 * @property {Addressees} addressees
 * 
 * @typedef AddresseeOptions
 * @type {Object}
 * @property {Number|'all'|'any'} to
 */

class ChannelNode {

    /**
     * @param {ChannelNodeConstuctorOptions} options 
     */
    constructor({delay, root, addressees}) {
        /**
         * @private
         */
        this.delay = delay

        /**
         * @private
         */
        this.root = root

        /**
         * @private
         */
        this.addressees = addressees

        /**
         * @private 
         * @type {Map.<Number, Channel>}
         */
        this.children = new Map()
    }

    /**
     * @param {Number} number 
     * @returns {Channel}
     */
    get(number) {
        return this.children.get(number)
    }

    /**
     * @param {Number} number 
     * @returns {Boolean}
     */
    has(number) {
        return this.children.has(number)
    }

    get numbers() {
        return [...this.addressees.numbers]
    }

    async init() {}

    /**
     * @param {String} number 
     */
    appendChannel(number) {}

    /**
     * @param {Number} number 
     * @param {MessagePort} port 
     */
    setPort(number, port) {}

    /**
     * @param {any} message 
     * @param {*} options 
     */
    post(message, options) {}

    /**
     * @param {any} message 
     * @param {Array.<Number>} numbers
     * @param {import('./Channel').SendOptions} options 
     * @returns {Array.<{number: Number, result: Number}>}
     */
    send(event, message, numbers, options) {
        return numbers.map(number => {
            return {
                number,
                result: this.children.get(number).send(event, message, options)
            }
        })
    }

    /**
     * @param {Number} number 
     * @param {Number} delay 
     */
    remove(number, delay) {}

    /**
     * @param {Number} delay 
     */
    destroy(delay) {}
}


module.exports = ChannelNode