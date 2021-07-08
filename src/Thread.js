const events = require('events')
const ChannelNode = require('./ChannelNode')
const Options = require('./Options')
const Interceptor = require('./Interceptor')
const ThreadError = require('./Error')


/**
 * @typedef OptionsThread
 * @type {Object}
 * @property {any} data
 * @property {Map.<string, Map.<number, MessagePort>>} channels
 * @property {import('./MainThread').OptionsDelay} delay
 * @property {import('./Channel').Addressee} addressee
 */


class Thread extends events.EventEmitter {
    /**
     * @param {OptionsThread} options
     * @param {MessagePort} port
     */
    constructor(options, port) {
        super()

        options.channels.set('main', new Map([[1, port]]))

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
     * @throws {ThreadError.ThreadPoolNotExists}
     */
    get(name) {
        if (this.has(name)) {
            return this.children.get(name)
        } else {
            throw new ThreadError.ThreadPoolNotExists(name)
        }
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
        return this.options.addressee.name
    }

    /**
     * @returns {Number}
     */
    get number() {
        return this.options.addressee.number
    }

    /**
     * @returns {any}
     */
    get data() {
        return this.options.data
    }

    async init() {
        if (this.inited) {
            return void 0
        }


    }

    /**
     * @param {String} name 
     * @returns {Interceptor}
     */
    to(name) {
        return new Interceptor(name, this)
    }
}


module.exports = Thread