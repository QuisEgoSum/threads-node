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


class ChannelNode extends Map {

    /**
     * @param {ChannelNodeConstuctorOptions} options 
     */
    constructor({delay, root, addressees}) {
        super()

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
     * @param {*} options 
     */
    send(message, options) {}

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