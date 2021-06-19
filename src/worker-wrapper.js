const {Worker} = require('worker_threads')
const Channel = require('./channel')
const {createId} = require('./helpers')
const {DeathBeforeInitialization, InternalTimeoutHasExpired, ThreadExit, ExceededDeathsCount, ExceededDelayStartWorker} = require('./error')


class WorkerWrapper extends Channel {

    /**
     * @param {import('./master')} master
     * @param {String} name 
     * @param {Number} number 
     * @param {String} entry 
     * @param {EventEmitter} emitter 
     * @param {{rejectDelayPost: Number, rejectDelaySend: Number, internalRejectDelay: Number,
     * numberDeathsForTerminateProcess: Number, durationDeathCountTime: Number, delayStartingWorker: Number}} otherOptions
     */
    constructor(master, emitter, name, number, entry,
        {
            rejectDelayPost,
            rejectDelaySend,
            internalRejectDelay,
            numberDeathsForTerminateProcess,
            durationDeathCountTime,
            delayStartingWorker
        },
        workerOptions
    ) {

        super(name, number, emitter, rejectDelaySend, rejectDelayPost, internalRejectDelay)

        this._master = master
        this.workerOptions = workerOptions || ({})

        /**
         * @type {Map.<string, {resolve: Function, timeout: setTimeout}>}
         */
        this._internalQueue = new Map()
        this._entry = entry

        /** @type {Worker} */
        this.worker = null

        this._deathCounter = 0
        this._isCheckDeath = 0 !== numberDeathsForTerminateProcess

        this._numberDeathsForTerminateProcess = numberDeathsForTerminateProcess
        this._durationDeathCountTime = durationDeathCountTime
        this._delayStartingWorker = delayStartingWorker
        this._deathCounterInTime = 0
    }


    /**
     * @returns {Promise.<WorkerWrapper>}
     */
    run(workerData, transferList, masterPort) {

        workerData.deaths = this._deathCounter

        this.worker = new Worker(this._entry, {...this.workerOptions, workerData, transferList})

        this.updatePort(masterPort)

        this.worker.on('message', (...args) => this._internalMessage(...args))
        this.worker.on('error', (...args) => this._error(...args))
        this.worker.on('messageerror', (...args) => this._messageerror(...args))
        this.worker.on('exit', (...args) => this._exit(...args))

        return new Promise(resolve => 
            this.worker.once('online', () => 
                this.internalPost('preInit', undefined, undefined, this._delayStartingWorker)
                    .then(resolve)
                    .catch(() => { throw new ExceededDelayStartWorker(this.name, this.number, this._delayStartingWorker) })
            )
        )
    }

    /**
     * To send service messages to the worker with further waiting for a response.
     * 
     * @param {String} type 
     * @param {any} message 
     * @param {{transfer: MessagePort[]}|undefined} options 
     */
    internalPost(type, message, transferList, delay = this._internalRejectDelay) {
        return new Promise((resolve, reject) => {
            const messageId = createId()
            this.worker.postMessage({type, message, messageId}, transferList)
            this._internalQueue.set(messageId, {
                resolve,
                timeout: setTimeout(() => setImmediate(() => {
                    if (this._internalQueue.has(messageId)) {
                        this._internalQueue.delete(messageId)
                        reject(new InternalTimeoutHasExpired())
                    }
                }), delay)
            })
        })
    }

    terminate(delay) {
        return new Promise((resolve, reject) =>
            this.internalPost('terminate', undefined, undefined, delay)
                .then(async (answer) => {
                    await this.worker.terminate()
                    resolve({ok: 1, message: answer, workerName: this.name, workerNumber: this.number})
                })
                .catch(() => reject({ok: 0, message: 'The timeout has expired', workerName: this.name, workerNumber: this.number}))
        )
    }


    /**
     * @param {{type: String, messageId: String}} msg 
     */
    _internalMessage(msg) {
        if (msg.type === 'answer') {
            if (this._internalQueue.has(msg.messageId)) {
                const {timeout, resolve} = this._internalQueue.get(msg.messageId)
                this._internalQueue.delete(msg.messageId)
                clearTimeout(timeout)
                resolve(msg.message)
            }
        }
    }

    /**
     * Called in response to the "error" event of the worker.
     * 
     * @param {Error} error 
     */
    _error(error) {
        error.workerName = this.name
        error.workerNumber = this.number
        error.event = 'error'
        this._emitter.emit('error', error)
    }

    /**
     * Called in response to the "messageerror" event of the worker.
     * 
     * @param {Error} error 
     */
    _messageerror(error) {
        error.workerName = this.name
        error.workerNumber = this.number
        error.event = 'messageerror'
        this._emitter.emit('error', error)
    }

    /**
     * Called in response to the "exit" event of the worker.
     * 
     * @param {Number} code 
     */
    _exit(code) {

        if (!this._master.inited)
            throw new DeathBeforeInitialization(this.name, this.number)

        this._deathCounter++

        this.active = false

        if (code === 435) 
            return

        this._emitter.emit('error', new ThreadExit(this.name, this.number, code))

        if (this._isCheckDeath)
            this._checkDeath()

        this._master.restartWorker(this.name, this.number)
    }

    /** @returns {Boolean} */
    _checkDeath() {
        this._deathCounterInTime++
        if (this._deathCounterInTime >= this._numberDeathsForTerminateProcess) {
            throw new ExceededDeathsCount(this.name, this.number, this._deathCounterInTime, this._deathCounter, this._durationDeathCountTime)
        } else {
            setTimeout(() => this._deathCounterInTime--, this._durationDeathCountTime)
        }
    }
}


module.exports = WorkerWrapper