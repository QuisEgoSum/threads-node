const {ThreadNotActive, TimeoutHasExpired} = require('./error')
const {createId} = require('./helpers')


module.exports = class Channel {

    /**
     * @param {import('events').EventEmitter} tire
     * @param {MessagePort} cord
     * @param {import('./main-thread').ChannelOptions} options
     * @param {{name: String, number: Number}} worker
     */
    constructor(tire, cord, options, active, worker) {

        /** @private */
        this.active = active
        /** @private */
        this._worker = worker
        /** @private */
        this._tire = tire
        /** @private */
        this._options = options

        /** @private @type {Array.<{event: String, message: *, delay: Number, id: String, transferList: Array: MessagePort[]}>} */
        this._sendQ = new Array()
        /** @private @type {Map.<String, {timeout: setTimeout, resolve: Function}>} */
        this._answerQ = new Map()
        /** @private @type {Map.<String, {timeout: setTimeout}>} */
        this._checkQ = new Map()
        /** @private @type {Map.<String, {timeout: setTimeout}>} */
        this._readyQ = new Map()

        if (cord) {
            this.addListeners(cord)
        }
    }

    get readyStore() {
        return this._options.minReadyStore
    }

    get name() {
        return this._worker.name
    }

    get number() {
        return this._worker.number
    }

    /**
     * @param {MessagePort} cord 
     */
    addListeners(cord) {

        this.removeListeners()

        this._cord = cord

        this._cord.once('close', () => this.active = false)
        this._cord.on('message', (...args) => this._message(...args))

    }

    /**
     * @async
     * @returns {Promise.<void>}
     */
    init() {
        const messageId = createId()
        this._cord.postMessage({type: 'init', id: messageId})
        return new Promise((resolve, reject) => {
            this._answerQ.set(messageId, {
                resolve,
                timeout: setTimeout(() => setImmediate(() => {
                    if (this._answerQ.has(messageId)) {
                        this._answerQ.delete(messageId)
                        reject(new TimeoutHasExpired())
                    }
                }), 1000)
            })
        })
    }

    /**
     * @private
     * @param {{id: String}} param0 
     */
    _init({id}) {
        this.active = true

        this._cord.postMessage({type: 'answer', id})

        setImmediate(() => {
            if (this._sendQ.length) {
                const sendQ = [...this._sendQ]
                this._sendQ.length = 0
                sendQ.forEach(({event, message, delay, id, transferList}) => this.send(event, message, delay, id, transferList))
            }
        })
    }

    removeListeners() {
        if (this._cord) {
            this._cord.removeAllListeners('close')
            this._cord.removeAllListeners('message')
        }
    }

    /**
     * @param {String} event 
     * @param {*} message 
     * @param {Number} delay 
     * @param {String} [messageId] 
     * @returns {void}
     */
    send(event, message, delay, messageId = createId(), transferList = []) {
        if (!this.active) {
            /**
             * It is not assumed that any of the threads will completely die,
             * so this queue is not cleared.
             */
            if (delay !== 0)
                this._sendQ.push({event, message, delay, id: messageId, transferList})

            return void 0
        }

        if (delay === 0) {
            this._cord.postMessage({event, message, type: 'send', id: messageId, transferList})
        } else {
            this._cord.postMessage({event, message, type: 'send', id: messageId, transferList})
            this._checkQ.set(messageId, {
                timeout: setTimeout(() => setImmediate(() => {
                    if (this._checkQ.has(messageId)) {
                        this._checkQ.delete(messageId)
                        this.send(event, message, delay, messageId, transferList)
                    }
                }), delay)
            })
        }
    }

    /**
     * @async
     * @param {String} event 
     * @param {*} message 
     * @param {Number} delay 
     * @param {String} [messageId] 
     * @returns {Promise.<*>}
     * @throws {ThreadNotActive, TimeoutHasExpired}
     */
    post(event, message, delay, messageId = createId()) {
        return new Promise((resolve, reject) => {
            if (!this.active) {
                return reject(new ThreadNotActive())
            }

            this._cord.postMessage({event, message, type: 'post', id: messageId})
            this._answerQ.set(messageId, {
                resolve,
                timeout: setTimeout(() => setImmediate(() => {
                    if (this._answerQ.has(messageId)) {
                        this._answerQ.delete(messageId)
                        reject(new TimeoutHasExpired())
                    }
                }), delay)
            })
        })
    }

    /**
     * @private
     * @param {{type: String}} msg 
     */
    _message(msg) {
        switch (msg.type) {
            case 'send':
                this._send(msg)
                break
            case 'post':
                this._post(msg)
                break
            case 'check':
                this._check(msg)
                break
            case 'answer':
                this._answer(msg)
                break
            case 'init':
                this._init(msg)
                break
            default:
                console.warn(`[Channel] Not supported type ${msg.type}`)
                break
        }
    }

    /**
     * @private
     * @param {{event: String, message: *, id: String}} param0 
     */
    _send({event, message, id}) {
        this._cord.postMessage({type: 'check', id})
        if (!this._readyQ.has(id)) {
            if (this._readyStore > 0) {
                this._readyQ.set(id, {
                    timeout: setTimeout(() => {
                        this._readyQ.delete(id)
                    }, this._readyStore)
                })
            }
            this._tire(event, message, {from: {name: this.name, number: this.number}})
        }
    }

    /**
     * @private
     * @param {{event: String, message: *, id: String}} param0 
     */
    _post({event, message, id}) {
        this._tire(event, message, {
            from: {name: this.name, number: this.number},
            answer: answer => this._cord.postMessage({type: 'answer', message: answer, id})
        })
    }

    /**
     * @private
     * @param {{message: *, id: String}} param0 
     */
    _answer({message, id}) {
        if (this._answerQ.has(id)) {
            const {timeout, resolve} = this._answerQ.get(id)
            this._answerQ.delete(id)
            clearTimeout(timeout)
            resolve(message)
        }
    }

    /**
     * @private
     * @param {{id: String}} param0 
     */
    _check({id}) {
        if (this._checkQ.has(id)) {
            const {timeout} = this._checkQ.get(id)
            this._checkQ.delete(id)
            clearTimeout(timeout)
        }
    }
}