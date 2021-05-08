const {isMainThread, workerData, parentPort} = require('worker_threads')
const Thread = require('./thread')
const Channel = require('./channel')


/**
 * @typedef Options 
 * @type {Object} 
 * @property {String} name 
 * @property {Number} number
 * @property {Number} deaths
 * @property {Number} rejectDelayPost
 * @property {Number} rejectDelaySend
 * @property {Number} internalRejectDelay
 * @property {Object.<string, Object.<number, MessagePort>>} ports
 * @property {any} data
 */


class Worker extends Thread {

    /**
     * @param {Options} workerData
     * @param {MessagePort} parentPort
     */

    constructor({name, number, deaths, rejectDelayPost, rejectDelaySend, internalRejectDelay, ports, data}, parentPort) {

        super()

        this._parentPort = parentPort
        this._parentPort.on('message', (...args) => this._message(...args))

        this.name = name
        this.number = number
        this.deaths = deaths
        this.data = data

        for (const workersName in ports) {
            const workersChannels = new Map()
            for (const workerNumber in ports[workersName]) {
                const channel = new Channel(workersName, workerNumber, this._emitter, rejectDelayPost, rejectDelaySend, internalRejectDelay)
                channel.updatePort(ports[workersName][workerNumber])
                workersChannels.set(Number(workerNumber), channel)
            }
            this._workers.set(workersName, workersChannels)
        }
    }

    /**
     * Receives messages from the master.
     * 
     * @param {Object} msg 
     * @param {String} msg.type
     */
    _message(msg) {
        if (msg.type === 'channel') {
            this._updateChannel(msg)
        } else if (msg.type === 'init') {
            this._init(msg)
        } else if (msg.type === 'preInit') {
            this._parentPort.postMessage({type: 'answer', messageId: msg.messageId})
        } else if (msg.type === 'terminate') {
            this._terminate(msg)
        }
    }

    /**
     * Called in response to the wizard's message about initialization.
     * Initializes the channels (causes the exchange of welcome messages with the other party) and waits for the success of all.
     * Calls the "init" event after which it is allowed to send messages to other threads.
     * Responds to the master about success
     */
    async _init({messageId}) {

        /** @type {Promise.<any>[]} */
        const promises = []

        this._workers.forEach(workers => workers.forEach(workerChannel => promises.push(workerChannel.init())))

        await Promise.all(promises)

        this.inited = true

        this._emitter.emit('init')

        this._parentPort.postMessage({messageId: messageId, type: 'answer'})
    }

    /**
     * Updates the channel for the specified recipient and responds to the master.
     * 
     * @param {{message: {name: String, number: Number, port: MessagePort}, messageId: String}} param 
     */
    _updateChannel({message: {name, number, port}, messageId}) {
        this._workers.get(name).get(number).updatePort(port)
        this._parentPort.postMessage({messageId: messageId, type: 'answer'})
    }

    _terminate({messageId}) {
        this._emitter.emit('terminate', {end: (answer) => {
            this._parentPort.postMessage({type: 'answer', messageId, message: answer})
            process.exit(435)
        }})
    }
}

/** @type {Worker} */
let worker = isMainThread ? null : new Worker(workerData, parentPort)


module.exports = worker