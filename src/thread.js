const EventEmitter = require('events').EventEmitter
const {isMainThread, workerData, parentPort} = require('worker_threads')
const Channels = require('./channels')
const {ThreadNotExist} = require('./error')


/**
 * @typedef ThreadOptions
 * @type {Object}
 * @property {*} [data]
 * @property {Map.<string, Map.<number, MessagePort>>} options.ports
 * @property {import('./main-thread').ChannelOptions} options.channelOptions
 * @property {{name: String, number: Number}} options.options
 */

class Thread extends EventEmitter {

    /**
     * @param {ThreadOptions} options 
     */
    constructor(cord, options) {
        super()

        this.data = options.data

        this._options = options.options

        this._tire = this.emit.bind(this)
        this.emit = undefined

        /** @type {Map.<string, Channels>} */
        this.channels = new Map()

        this.channels.set('main', new Channels(this._tire, options.channelOptions).init('main', new Map([[1, cord]]), true))

        for (const [name, ports] of options.ports.entries()) {
            this.channels.set(name, new Channels(this._tire, options.channelOptions).init(name, ports))
        }
    }

    async init() {

        const promises = []

        this.channels.forEach(
            channels => channels.forEach(
                /**@param {import('./channel')} channel*/
                channel => promises.push(channel.init())))

        this.to('main').send(`#init-${this.name}-${this.number}`)


        await new Promise(resolve => this.once('#init', resolve))

        this._tire('init')
    }

    get name() {
        return this._options.name
    }

    get number() {
        return this._options.number
    }
    /**
     * @param {String} name 
     * @param {Number} number 
     * @returns {Channels}
     * @throws {ThreadNotExist}
     */
    to(name) {
        if (this.channels.has(name)) {
            return this.channels.get(name)
        } else {
            throw new ThreadNotExist()
        }
    }
}


module.exports = isMainThread ? null : new Thread(parentPort, workerData)