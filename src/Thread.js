const events = require('events')
const ChannelNode = require('./ChannelNode')
const ThreadOptions = require('./ThreadOptions')


/**
 * @typedef OptionsThread
 * @type {Object}
 * @property {*} data
 * @property {Map.<string, Map.<number, MessagePort>>} channels
 * @property {import('./MainThread').OptionsDelay} delay
 */


class Thread extends events.EventEmitter {
    /**
     */
    constructor() {
        super()

        this.inited = false

        /**
         * @private
         * @type {Map.<String, ChannelNode>}
         */
        this.children = new Map()
    }

    /**
     * @returns {String}
     */
    get name() {}

    /**
     * @returns {String}
     */
    get number() {}

    init() {}

    /**
     * @param {String} name 
     * @returns {ChannelNode}
     */
    to(name) {
        return this.children.get(name)
    }
}


module.exports = Thread