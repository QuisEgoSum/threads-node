const events = require('events')
const {MainThreadOptions} = require('./Options')
const ThreadError = require('./Error')
const ThreadPool = require('./ThreadPool')


/**
 * Part of the original worker_threads options
 * @typedef WorkerOptions
 * @type {Object}
 * @property {any[]} [argv]
 * @property {NodeJS.Dict<String> | typeof import('worker_threads').SHARE_ENV} [env]
 * @property {Boolean} [eval]
 * @property {String[]} [execArgv]
 * @property {Boolean} [stdin]
 * @property {Boolean} [stdout]
 * @property {Boolean} [stderr]
 * @property {Boolean} [trackUnmanagedFds]
 * @property {import('worker_threads').ResourceLimits} [resourceLimits]
 * 
 * @typedef OptionsThread
 * @type {Object}
 * @property {String} name 
 * The name of the thread pool, used to refer to the thread
 * @property {Number} number
 * The number of threads. Default is 1
 * @property {Array.<String>} messages
 * List of threads with which it should have a direct communication channel
 * @property {String} entry
 * The path to the thread entry point file
 * @property {*} data 
 * The object to be passed to the thread
 * @property {WorkerOptions} options
 * Thread options available from the worker_threads module
 * 
 * @typedef OptionsDelay
 * @type {Object}
 * @property {Number} send
 * The time until the message is sent again if there is no confirmation of receipt.
 * Default: 1000
 * @property {Number} post
 * The time until the promise is rejected while waiting for a response to the message.
 * Default: 200
 * @property {Number} ready 
 * The time when the identifiers of the received "send" messages are cached.
 * Used to prevent multiple sending of a single message.
 * Default: 5000
 * @property {Number} init
 * Default: 1000
 * @property {Number} destroy
 * Default: 1000
 * 
 * @typedef Options
 * @type {Object} 
 * @property {OptionsThread[]} threads
 * @property {OptionsDelay} delay
 * @property {Number} TERMINATE_CODE
 * The exit code of the thread, in which no attempts will be made to re-raise it.
 * Default: 1984
 * 
 * @typedef ChannelNodeOptions
 * @type {Object}
 * @property {String} name
 * @property {Number} number
 * @property {OptionsDelay} delay 
 */


class MainThread extends events.EventEmitter {
    /**
     * @param {Options} options 
     */
    constructor(options) {
        super()

        this.inited = false

        /**
         * @private
         */
        this.options = new MainThreadOptions(options)

        /**
         * @private
         * @type {Map.<String, ThreadPool>}
         */
        this.children = new Map()

        this.on('#exit', (code, name, number) => this.threadExit(code, name, number))
    }

    async init() {}

    /**
     * @param {String} name
     * @returns {import('./ThreadPool')}
     */
    to(name) {
        return this.children.get(name)
    }

    /**
     * @private
     * @param {Number} code
     * @param {String} name
     * @param {Number} number
     */
    async threadExit(code, name, number) {
        if (!this.inited) {
            this.emit('error', new ThreadError.ThreadDeathBeforeInitialization(code, name, number))

            await this.to(name).remove(number, this.options.delay.destroy)

            return void 0
        }
    }

    /**
     * @param {String} name 
     * @param {Number} delay
     */
    async remove(name, delay) {}

    /**
     * @param {Number} delay 
     */
    async destroy(delay) {}
}


module.exports = MainThread