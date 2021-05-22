const {EventEmitter} = require('events')
const ChannelNode = require('./ChannelNode')
const ThreadOptions = require('./ThreadOptions')


/**
 * @typedef OptionsThread
 * @type {Object}
 * @property {*} data
 * @property {Map.<string, Map.<number, MessagePort>>} channels
 * @property {import('./MainThread').OptionsDelay} delay
 */


class Thread extends EventEmitter{
    /**
     * @param {OptionsThread} options 
     * @param {MessagePort} mainPort
     */
    constructor(options) {
        super()

        /**
         * @private
         * @type {Map.<string, import('./ChannelNode')>}
         */
        this.nodes = new Map()

        options
            .channels
            .forEach(
                (node, name) => this
                    .nodes
                    .set(name, new ChannelNode(name, node, options.delay, this))
            )

        this.data = options.data



        const emit = this.emit.bind(this)
    }

    init() {}

    /**
     * @returns {import('./ChannelNode')}
     */
    to() {}
}


module.exports = Thread