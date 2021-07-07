const events = require('events')
const ChannelNode = require('./ChannelNode')
const ThreadOptions = require('./ThreadOptions')
const Interceptor = require('./Interceptor')


/**
 * @typedef OptionsThread
 * @type {Object}
 * @property {*} data
 * @property {Map.<string, Map.<number, MessagePort>>} channels
 * @property {import('./MainThread').OptionsDelay} delay
 */


class Thread extends events.EventEmitter {
    /**
     * @param {any} options
     * @param {MessagePort} port
     */
    constructor(options, port) {
        super()

        /**
         * @private
         */
        this.options = options

        this.inited = false

        /**
         * @private
         * @type {Map.<String, ChannelNode>}
         */
        this.children = new Map()
    }

    /**
     * @param {String} name 
     * @returns {ChannelNode}
     */
    get(name) {
        return this.children.get(name)
    }

    /**
     * @param {String} name 
     * @returns {Boolean}
     */
    has(name) {
        return this.children.has(name)
    }

    /**
     * @returns {String}
     */
    get name() {
        return this.options.name
    }

    /**
     * @returns {Number}
     */
    get number() {
        return this.options.number
    }

    /**
     * @returns {any}
     */
    get data() {
        return this.options.data
    }

    init() {}

    /**
     * @param {String} name 
     * @returns {Interceptor}
     */
    to(name) {
        return new Interceptor(name, this)
    }
}


module.exports = Thread