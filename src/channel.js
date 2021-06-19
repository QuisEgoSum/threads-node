const {createId} = require('./helpers')
const {TimeoutHasExpired, InternalTimeoutHasExpired, WorkerNotActive} = require('./error')


class Channel {

    /**
     * @param {String} name 
     * @param {Number} number 
     * @param {EventEmitter} emitter 
     * @param {Number} rejectDelayPost 
     * @param {Number} rejectDelaySend
     * @param {Number} internalRejectDelay
     */
    constructor(name, number, emitter, rejectDelayPost, rejectDelaySend, internalRejectDelay) {

        this.active = false

        this.name = name
        this.number = number

        this._rejectDelayPost = rejectDelayPost
        this._rejectDelaySend = rejectDelaySend
        this._internalRejectDelay = internalRejectDelay

        /** @type {Object.<string, {resolve: Function, timeout: setTimeout}>} */
        this._queueAnswer = {}

        /** @type {Object.<string, {data: {event: String, message: any, messaegId: String}, timeout: setTimeout}>} */
        this._queueCheck = {}

        /** @type {Array.<{event: String, message: any}>} */
        this._queueSend = []

        this._queueReady = new Map()

        /** @type {EventEmitter} */
        this._emitter = emitter

        /** @type {MessagePort} */
        this._port = null
    }

    /** Sends an initialization message to the other party and waits for a response. */
    init() {
        return new Promise((resolve, reject) => {

            const messageId = createId()

            this._port.postMessage({type: 'init', messageId})

            this._queueAnswer[messageId] = {
                resolve: () => {
                    this.active = true
                    resolve()
                },
                timeout: setTimeout(() => {
                    delete this._queueAnswer[messageId]
                    reject(new InternalTimeoutHasExpired())
                }, this._internalRejectDelay)
            }
        })
    }

    /** @param {MessagePort} port  @returns {undefined} */
    updatePort(port) {
        if (this._port)
            ['message', 'close'].forEach(event => this._port.removeAllListeners(event))

        this._port = port
        this._port.once('close', () => this.active = false)
        this._port.on('message', (...args) => this._message(...args))
    }

    /**
     * @param {String} event 
     * @param {*} message 
     * @param {undefined|String} messageId 
     * @returns {undefined}
     */
    send(event, message, messageId) {

        if (!this.active) {
            this._queueSend.push({event, message})
            return
        }

        messageId = messageId || createId()

        this._port.postMessage({messageId, event, message, type: 'send'})

        this._queueCheck[messageId] = {
            data: {event, message, messageId},
            timeout: setTimeout(() => setImmediate(() => {
                if (this._queueCheck[messageId]) {
                    const {data} = this._queueCheck[messageId]
                    delete this._queueCheck[messageId]
                    this.send(data.event, data.message, data.messageId)
                }
            }), this._rejectDelaySend)
        }
    }

    /**
     * @param {String} event 
     * @param {*} message 
     * @param {Number} [rejectDelay] 
     * @returns {Promise.<any>}
     */

    post(event, message, rejectDelay = this._rejectDelayPost) {
        return new Promise((resolve, reject) => {
            if (!this.active)
                return reject(new WorkerNotActive())

            const messageId = createId()

            this._port.postMessage({type: 'post', event, message, messageId})
            this._queueAnswer[messageId] = {
                resolve,
                timeout: setTimeout(() => setImmediate(() => {
                    if (this._queueAnswer[messageId]) {
                        delete this._queueAnswer[messageId]
                        reject(new TimeoutHasExpired())
                    }
                }), rejectDelay)
            }
        })
    }

    /**
     * @typedef Message
     * @type {Object}
     * @property {String} type
     * @property {any} message
     * @property {String} [messageId]
     * @property {String} event
     */

    /**
     * @param {Message} msg 
     */
    _message(msg) {
        switch (msg.type) {
            case 'send':
                this._send(msg)
                break
            case 'post':
                this._post(msg)
                break
            case 'answer':
                this._answer(msg)
                break
            case 'check':
                this._check(msg)
                break
            case 'init':
                this._init(msg)
                break
            default:
                break
        }
    }

    /** @param {Message} message  */
    async _init({messageId}) {
        this.active = true
        this._port.postMessage({type: 'answer', messageId: messageId})
        setImmediate(() => {
            if (this._queueSend.length) {
                const toSend = [...this._queueSend]
                this._queueSend.length = 0
                toSend.forEach(({event, message}) => this.send(event, message))
            }
        })
    }

    /** @param {Message} message  */
    _post({event, message, messageId}) {
        this._emitter.emit(event, message, {
            from: {name: this.name, number: this.number},
            answer: data => void this._port.postMessage({type: 'answer', messageId, message: data})
        })
    }

    /** @param {Message} message  */
    _send({event, message, messageId}) {
        this._port.postMessage({type: 'check', messageId})
        if (!this._queueReady.has(messageId)) {
            this._queueReady.set(messageId, {
                timeout: setTimeout(() => {
                    this._queueReady.delete(messageId)
                }, 15000)
            })
            this._emitter.emit(event, message, {from: {name: this.name, number: this.number}})
        }
    }

    /** @param {Message} message  */
    _check({messageId}) {
        if (this._queueCheck[messageId]) {
            const {timeout} = this._queueCheck[messageId]
            clearTimeout(timeout)
            delete this._queueCheck[messageId]
        }
    }

    /** @param {Message} message  */
    _answer({messageId, message}) {
        if (this._queueAnswer[messageId]) {
            const {resolve, timeout} = this._queueAnswer[messageId]
            delete this._queueAnswer[messageId]
            clearTimeout(timeout)
            resolve(message)
        }
    }
}


module.exports = Channel