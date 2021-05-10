const {MessageChannel} = require('worker_threads')
const EventEmitter = require('events').EventEmitter
const {WorkerNotExist, DeathBeforeInitialization} = require('./error')
const ThreadsPool = require('./thread-pool')


const TERMINATE_CODE = 1984


/**
 * @typedef ThreadOptions
 * @type {Object}
 * @property {String} name
 * @property {Number} [numberOf]
 * @property {String} entry
 * @property {Array.<String>} [messages]
 * @property {*} [data]
 * @property {{argv: *, env: *, eval: *, execArgv: *, stdin: *, stdout: *, stderr: *, trackUnmanagedFds: *, resourceLimits: *}} options
 * 
 * @typedef MainThreadOptions
 * @type {Object}
 * @property {ThreadOptions[]} threads
 * @property {Number} delaySend
 * 0 - Do not confirm
 * Default 200
 * @property {Number} delayPost
 * Default 200
 * @property {Number} minReadyStore
 * 
 * @typedef ChannelOptions
 * @type {Object}
 * @property {Number} delaySend
 * @property {Number} delayPost
 * @property {Number} minReadyStore
 * 
 */


class MainThread extends EventEmitter {

    /**
     * @param {MainThreadOptions} mainThreadOptions
     */
    constructor(mainThreadOptions) {
        super()

        const {threads = [], delayPost = 200, delaySend = 200, minReadyStore = 400} = mainThreadOptions

        this.inited = false

        /** @private */
        this._channelOptions = {delayPost, delaySend, minReadyStore}

        const threadsOptions = this._normalizeThreadsOptions(threads)

        /** @type {Map.<string, ThreadsPool>} */
        this.pools = new Map()

        /** @private */
        this._tire = this.emit.bind(this)
        /** @private @type {undefined} */
        this.emit = undefined

        threadsOptions.forEach(options => this.pools.set(options.name, new ThreadsPool(this._tire, options, this._channelOptions)))
    }

    /**
     * @private
     * @param {String} name 
     * @param {Number} number 
     * @param {MessagePort} port 
     * @param {Map.<string, Map.<number, MessagePort>>} channels 
     */
    _exchange(name, number, port, channels) {
        if (!channels.has(name))
            channels.set(name, new Map())

        channels.get(name).set(number, port)
    }

    async init() {
        if (this.inited)
            return this

        this.on('exit', (...args) => this._exit(...args))

        /** @type {Map.<string, Map.<number, Map.<string, Map.<number, MessagePort>>>>} */
        const channels = new Map()

        this.pools.forEach((pool, name) => channels.set(name, new Map(
            new Array(pool.numberOf).fill(0).map((_, i) => ([i + 1, new Map()]))
        )))

        for (const [poolName, pool] of this.pools.entries()) {
            const poolChannels = channels.get(poolName)

            if (pool.messages.includes(poolName)) {
                for (let c = 1; c <= pool.numberOf; c++) {
                    for (let n = c + 1; n <= pool.numberOf; n++) {
                        const {port1, port2} = new MessageChannel()
                        this._exchange(poolName, c, port1, poolChannels.get(n))
                        this._exchange(poolName, n, port2, poolChannels.get(c))
                    }
                }
            }

            for (const targetName of pool.messages) {
                if (targetName === poolName) continue
                const targetPool = this.pools.get(targetName)
                const targetChannels = channels.get(targetName)
                for (let c = 1; c <= pool.numberOf; c++) {
                    for (let t = 1; t <= targetPool.numberOf; t++) {
                        const {port1, port2} = new MessageChannel()
                        this._exchange(poolName, c, port1, targetChannels.get(t))
                        this._exchange(targetPool.name, t, port2, poolChannels.get(c))
                    }
                }
            }
        }

        const promises = []

        this.pools.forEach(pool => {
            pool.init(channels.get(pool.name)).forEach(thread => {
                /** TODO: Timeout reject */
                promises.push(new Promise(resolve => this.once(`#init-${thread.name}-${thread.number}`, resolve)))
            })
        })

        await Promise.all(promises)

        this.pools.forEach(pool => pool.send('#init', null, {to: 'all'}))

        this.inited = true

        this._tire('init')

        return this
    }

    /**
     * @param {String} name 
     * @param {Number} number 
     * @returns {ThreadsPool}
     * @throws {WorkerNotExist}
     */
    to(name) {
        if (this.pools.has(name)) {
            return this.pools.get(name)
        } else {
            throw new WorkerNotExist()
        }
    }

    // /**
    //  * @param {Number} maxDelay ms
    //  * @returns {Array.<Promise>}
    //  */
    // async terminate(maxDelay) {
    //     const promises = []

    //     this.pools.forEach(pool => promises.push(pool.terminate(maxDelay)))

    //     return promises
    // }

    /**
     * @private
     * @param {{name: String, number: Number, code: Number}} param0 
     */
    async _exit({name, number, code}) {
        if (code === TERMINATE_CODE) {
            return void 0
        }

        if (!this.inited) {
            this._tire('error', new DeathBeforeInitialization(name, number, code))
        }

        const pool = this.pools.get(name)

        /** @type {Map.<string, Map.<number, Map.<string, Map.<number, MessagePort>>>>} */
        const channels = new Map([[name, new Map([[number, new Map()]])]])

        pool.messages.forEach(name => channels.set(name, 
            new Map(
                new Array(this.pools.get(name).numberOf)
                    .fill(0)
                    .map((_, i) => ([i + 1, new Map()]))
            )
        ))

        const poolChannels = channels.get(name)

        if (pool.messages.includes(name)) {
            for (let n = 1; n <= pool.numberOf; n++) {
                const {port1, port2} = new MessageChannel()
                this._exchange(name, number, port1, poolChannels.get(n))
                this._exchange(name, n, port2, poolChannels.get(number))
            }
        }

        for (const targetName of pool.messages) {
            if (targetName === name) continue
            const targetPool = this.pools.get(targetName)
            const targetChannels = channels.get(targetName)
            for (let t = 1; t <= targetPool.numberOf; t++) {
                const {port1, port2} = new MessageChannel()
                this._exchange(name, number, port1, targetChannels.get(t))
                this._exchange(targetPool.name, t, port2, poolChannels.get(number))
            }
        }

        channels.forEach((channels, currentName) => {
            if (currentName === name) return void 0
            const currentPool = this.pools.get(currentName)
            channels.forEach((_, number) => {
                currentPool.get(number).setPorts(channels.get(number))
            })
        })

        this.pools.get(name).get(number).run(channels.get(name).get(number))

        await new Promise(resolve => this.once(`#init-${name}-${number}`, resolve))

        this.pools.get(name).get(number).send('#init')
    }

    /**
     * @private
     * @param {ThreadOptions[]} options 
     * @returns {ThreadOptions[]}
     */
    _normalizeThreadsOptions(options) {

        const tmp = new Map()

        for (const threadOptions of options) {
            if (!('messages' in threadOptions)) {
                threadOptions.messages = []
            }
            if (!('numberOf' in threadOptions)) {
                threadOptions.numberOf = 1
            }
            if (!('options' in threadOptions)) {
                threadOptions.options = {}
            }

            tmp.set(threadOptions.name, threadOptions)
        }

        for (const threadOptions of options) {
            for (let i = 0; i < threadOptions.messages.length; i++) {
                const name = threadOptions.messages[i]
                if (tmp.has(name)) {
                    const nextThreadOptions = tmp.get(name)
                    if (!nextThreadOptions.messages.includes(threadOptions.name))
                        nextThreadOptions.messages.push(threadOptions.name)
                } else {
                    threadOptions.messages.splice(i, 1)
                    i--
                }
            }
        }

        return options
    }
}


module.exports = MainThread