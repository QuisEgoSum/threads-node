const EventEmitter = require('events').EventEmitter
const {WorkerNotExist} = require('./error')


class Thread {
    
    constructor() {

        this.inited = false

        /** @type {Map.<string, Map.<Number, import('./worker-wrapper')|import('./channel')>>} */
        this._workers = new Map()

        /** @type {EventEmitter} */
        this._emitter = new EventEmitter()
    }

    /**
     * An alternative to subscribing to the "init" event.
     * @returns {Promise.<Worker>}
     */
    init() {
        return new Promise(resolve => this.inited ? resolve(this) : this.once('init', () => resolve(this)))
    }

    /**
     * @param  {String} event
     * @param {Function} listener
     */
    on(event, listener) {
        this._emitter.on(event, listener)
        return this
    }

    /**
     * @param  {String} event
     * @param {Function} listener
     */
    once(event, listener) {
        this._emitter.once(event, listener)
        return this
    }

    /** @param {String|Symbol} event  @param {Function} listener */
    removeListener(event, listener) {
        this._emitter.removeListener(event, listener)
        return this
    }

    /** @param {String} event */
    removeAllListeners(event) {
        this._emitter.removeAllListeners(event)
        return this
    }

    /**
     * Returns an object for sending messages to the worker or workers from the group by the specified name. 
     * You can specify the number of a specific worker, the workers are numbered starting with the number 1.
     * If there is no worker with this name or number, it will throw an error.
     * 
     * @param {String} name 
     * @param {Number} [target] Number worker. -1 - send any; 0 - send all. [-1, 0] - post any. default 0
     */
    to(name, target = 0) {

        if (!this._workers.has(name))
            throw new WorkerNotExist(`This workers ${name} doesn't exist`)

        const channelsWorkers = this._workers.get(name)

        if (channelsWorkers.size < target)
            throw new WorkerNotExist(`This worker ${name} number ${target} doesn't exist`)


        return {
            /**
             * For sending messages, when the second argument method "to" is set to -1 - send a message to all workers with the specified name, 0 - to any.
             * If the recipient does not confirm the receipt (the recipient will do this automatically), the sending will be repeated with the delay specified in the Master constructor(rejectDelaySend) until it receives confirmation.
             * If the recipient is not active at the time of sending (died and has not yet been revived), the message will wait in the queue until the recipient is revived.
             * 
             * @param {String} event 
             * @param {*} [message] 
             */
            send: (event, message) => {

                if (target === 0)
                    return channelsWorkers.forEach(channelWorker => channelWorker.send(event, message))

                const channelWorker = this._selectWorkerChannel(name, channelsWorkers, target, target === -1)

                return channelWorker.send(event, message)

            },
            /**
             * To send a message waiting for a response. "target" value of 0 or -1 to send to anyone.
             * If the recipient is not active it will throw an error.
             * If the recipient does not respond within the specified time, the promise will be rejected.
             * 
             * @param {String} event 
             * @param {*} [message] 
             * @param {Number} [rejectDelay] by default, specified in the Master constructor (rejectDelayPost)
             * @returns {Promise.<any>}
             */
            post: (event, message, rejectDelay) => {

                const channelWorker = this._selectWorkerChannel(name, channelsWorkers, target, (target === 0 || target === -1))

                return channelWorker.post(event, message, rejectDelay)
            }
        }
    }

    /**
     * Returns a positive random number in the range from min to max
     * 
     * @param {Number} [max] default 1
     * @param {Number} [min] default 0
     */
    _randomInt(max = 1, min = 0) {
        return Math.abs(Math.round(min - 0.5 + Math.random() * (max - min + 1)))
    }

    _selectWorkerChannel(name, channelsWorkers, number, isRandom) {

        if (isRandom)
            return Array.from(channelsWorkers)[this._randomInt(channelsWorkers.size - 1)][1]
    
        const channelWorker = channelsWorkers.get(number)
    
        if (!channelWorker)
            throw new WorkerNotExist(`This worker ${name} number ${number} doesn't exist`)
    
        return channelWorker
    }
}




module.exports = Thread