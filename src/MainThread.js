const {EventEmitter} = require('events')
const MainThreadOptions = require('./MainThreadOptions')


/**
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
 * @property {{argv: *, env: *, eval: *, execArgv: *, stdin: *, stdout: *, stderr: *, trackUnmanagedFds: *, resourceLimits: *}} options
 * Thread options available from the worker_threads module
 * 
 * @typedef OptionsDelay
 * @type {Object}
 * @property {Number} send
 * The time until the message is sent again if there is no confirmation of receipt.
 * @property {Number} post
 * The time until the promise is rejected while waiting for a response to the message.
 * @property {Number} ready 
 * The time when the identifiers of the received "send" messages are cached.
 * Used to prevent multiple sending of a single message.
 * 
 * @typedef Options
 * @type {Object} 
 * @property {OptionsThread[]} threads
 * @property {OptionsDelay} delay
 * @property {Number} TERMINATE_CODE
 * The exit code of the thread, in which no attempts will be made to re-raise it.
 * Default is 1984
 */


class MainThread extends EventEmitter {
    /**
     * @param {Options} options 
     */
    constructor(options) {
        options = new MainThreadOptions(options)


    }

    async init() {}

    /**
     * @returns {import('./ThreadPool')}
     */
    to() {}

    terminate() {}

    remove() {}
}


module.exports = MainThread