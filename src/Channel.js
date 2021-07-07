const {createId} = require('./utils')
const ThreadError = require('./Error')


/**
 * @typedef {String} MessageId
 * 
 * @typedef Addressee
 * @type {Object}
 * @property {String} name
 * @property {Number} number
 * 
 * @typedef ChannelOptions
 * @type {Object}
 * @property {Addressee} addressee
 * @property {import('./MainThread').OptionsDelay} delay
 * @property {import('./Thread')} root
 * 
 * @typedef SendOptions
 * @type {Object}
 * @property {String} event 
 * @property {any} [data]
 * @property {Number} [retryDelay]
 * @property {Number} [confirmDuration]
 * @property {Array.<MessagePort>} [transferList]
 * 
 * @typedef Send
 * @type {Object}
 * @property {MessageId} id 
 * @property {String} event 
 * @property {'send'} type
 * @property {any} [data]
 * @property {Number} retryDelay
 * @property {Boolean} confirm
 * @property {Number} [confirmDuration]
 * @property {Array.<MessagePort>} [transferList]
 * 
 * @typedef SendMessage
 * @type {Object}
 * @property {String} id
 * @property {String} event
 * @property {'send'} type
 * @property {any} data
 * @property {Boolean} confirm
 * @property {Number} [confirmDuration]
 * 
 * @typedef SendQ
 * @type {Array.<Send>}
 * 
 * @typedef ConfirmQItem
 * @type {Object}
 * @property {NodeJS.Timeout} timeout
 * 
 * @typedef {Map.<MessageId, ConfirmQItem>} ConfirmQ
 * 
 * @callback ResolveCallback
 * @param {any} [answer]
 *
 * @typedef AnswerQItem
 * @type {Object}
 * @property {NodeJS.Timeout} timeout
 * @property {ResolveCallback} resolve promise resolve function
 * 
 * @typedef {Map.<MessageId, AnswerQItem>} AnswerQ
 * 
 * @typedef ReadyQItem
 * @type {Object}
 * @property {NodeJS.Timeout} timeout
 * 
 * @typedef {Map.<MessageId, ReadyQItem>} ReadyQ
 * 
 * @typedef {any} Message
 * @typedef {String} MessageEvent
 * 
 * @typedef PostOptions
 * @type {Object}
 * @property {Number} [rejectDelay]
 * @property {String} [messageId]
 * @property {Array.<MessagePort>} [transferList]
 * 
 * @typedef PostMessage
 * @type {Object}
 * @property {String} id
 * @property {'post'} type
 * @property {String} event
 * @property {any} [msg]
 * 
 * @typedef ConfirmMessage
 * @type {Object}
 * @property {String} id
 * @property {'confirm'} type
 * 
 * @typedef AnswerMessage
 * @type {Object}
 * @property {String} id
 * @property {'answer'} type
 * @property {any} msg
 * 
 * @typedef InitMessage
 * @type {Object}
 * @property {String} id
 * @property {'init'} type
 * 
 * @typedef {SendMessage|PostMessage|AnswerMessage|ConfirmMessage|InitMessage} MessageObject
 * 
 * @typedef MESSAGE_TYPE
 * @type {Object}
 * @property {'send'} SEND
 * @property {'post'} POST
 * @property {'answer'} ANSWER
 * @property {'confirm'} CONFIRM
 * @property {'init'} INIT
 */


class Channel {
    /**
     * @param {ChannelOptions} options 
     */
    constructor({delay, addressee, root}) {
        this.active = false

        /**
         * @type {MESSAGE_TYPE}
         */
        this.MESSAGE_TYPE = {
            SEND: 'send',
            POST: 'post',
            ANSWER: 'answer',
            CONFIRM: 'confirm',
            INIT: 'init'
        }

        /**
         * @private
         * @type {MessagePort}
         */
        this.port = null

        /**
         * @private
         */
        this.root = root

        /**
         * @private
         */
        this.delay = delay

        /**
         * @private
         */
        this.addressee = addressee

        /**
         * @private
         * @type {SendQ}
         */
        this.sendQ = new Array()

        /**
         * @private
         * @type {ConfirmQ}
         */
        this.confirmQ = new Map()

        /**
         * @private
         * @type {AnswerQ}
         */
        this.answerQ = new Map()

        /**
         * @private
         * @type {ReadyQ}
         */
        this.readyQ = new Map()

        /**
         * @private
         */
        this.messageListener = msg => this.onMessage(msg)

        /**
         * @private
         */
        this.closedListener = () => void (this.active = false)
    }

    init() {
        const messageId = createId()

        this.port.postMessage(
            {
                id: messageId,
                type: this.MESSAGE_TYPE.INIT
            }
        )

        return new Promise((resolve, reject) => {
            this.answerQ.set(messageId,
                {
                    resolve,
                    timeout: setTimeout(
                        () => setImmediate(
                            () => {
                                if (this.answerQ.has(messageId)) {
                                    this.answerQ.delete(messageId)
                                    reject(new ThreadError.TimeoutHasExpired())
                                }
                            }
                        ),
                        this.delay.init
                    )
                }
            )
        })
    }

    /**
     * @param {MessagePort} port 
     * @returns {Channel}
     */
    setPort(port) {
        this.port = port

        //@ts-ignore
        this.port.on('message', this.messageListener)
        //@ts-ignore
        this.port.on('close', this.closedListener)

        return this
    }

    /**
     * @returns {Channel}
     */
    removeListeners() {
        if (this.port) {
            this.port.removeEventListener('close',   this.closedListener)
            if (this.messageListener) {
                this.port.removeEventListener('message', this.messageListener)
            }
        }

        return this
    }

    /**
     * @param {SendOptions} options
     * @returns {Number}
     */
    send(options) {
        const retryDelay = options.retryDelay ?? this.delay.send

        return this._send(
            {
                id: createId(),
                event: options.event,
                type: this.MESSAGE_TYPE.SEND,
                data: options.data,
                retryDelay: retryDelay,
                confirm: retryDelay === 0,
                confirmDuration: options.confirmDuration,
                transferList: options.transferList
            }
        )
    }
    
    /**
     * @param {Send} options 
     */
    _send(options) {
        if (!this.active) {
            if (options.confirm) {
                this.sendQ.push(options)

                return 2
            }

            return 0
        }

        this.toSend(
            {
                id: options.id,
                event: options.event,
                type: options.type,
                data: options.data,
                confirm: options.confirm,
                confirmDuration: options.confirmDuration
            },
            options.transferList
        )

        if (options.confirm) {
            this.confirmQ.set(options.id,
                {
                    timeout: setTimeout(
                        () => setImmediate(
                            () => {
                                if (this.confirmQ.has(options.id)) {
                                    process.nextTick(
                                        () => this._send(options)
                                    )
                                }
                            }
                        ),
                        options.retryDelay
                    )
                }
            )
        }

        return 1
    }

    /**
     * @param {SendMessage} sendMessage 
     * @param {Array.<MessagePort>} [transferList] 
     */
    toSend(sendMessage, transferList) {
        return this.port.postMessage(sendMessage, transferList)
    }

    /**
     * @param {String} event 
     * @param {Message} msg 
     * @param {PostOptions} options 
     */
    post(event, msg, options) {
        return new Promise((resolve, reject) => {

            if (!this.active) {
                return reject(new ThreadError.ThreadNotActive(this.addressee.name, this.addressee.number))
            }

            const rejectDelay = options.rejectDelay ?? this.delay.post

            options.messageId = options.messageId || createId()

            this.port.postMessage(
                {
                    id: options.messageId,
                    type: this.MESSAGE_TYPE.POST,
                    event: event,
                    msg: msg,
                },
                options.transferList
            )

            this.answerQ.set(options.messageId,
                {
                    resolve,
                    timeout: setTimeout(
                        () => setImmediate(
                            () => {
                                if (this.answerQ.has(options.messageId)) {
                                    this.answerQ.delete(options.messageId)
                                    return reject(new ThreadError.TimeoutHasExpired())
                                }
                            }
                        ),
                        rejectDelay
                    )
                }
            )

            msg = null
        })
    }

    /**
     * @private
     * @param {String} messageId
     * @param {Number} [confirmDuration]
     * @returns {Boolean} it has already been delivered
     */
    confirm(messageId, confirmDuration) {
        this.port.postMessage(
            {
                id: messageId,
                type: this.MESSAGE_TYPE.CONFIRM
            }
        )

        if (this.readyQ.has(messageId)) {
            return true
        }

        this.readyQ.set(messageId,
            {
                timeout: setTimeout(
                    () => this.readyQ.delete(messageId), confirmDuration ?? this.delay.ready
                )
            }
        )

        return false
    }

    /**
     * @private
     * @param {String} messageId
     * @param {any} msg
     */
    answer(messageId, msg) {
        this.port.postMessage(
            {
                id: messageId,
                type: this.MESSAGE_TYPE.ANSWER,
                msg: msg
            }
        )
    }

    /**
     * @private
     * @param {MessageObject} msg
     */
    onMessage(msg) {
        switch (msg.type) {
            case this.MESSAGE_TYPE.SEND:
                return this.onSend(msg)
            case this.MESSAGE_TYPE.POST:
                return this.onPost(msg)
            case this.MESSAGE_TYPE.ANSWER:
                return this.onAnswer(msg)
            case this.MESSAGE_TYPE.CONFIRM:
                return this.onConfirm(msg)
            case this.MESSAGE_TYPE.INIT:
                return this.onInit(msg)
            default:
                return void 0
        }
    }

    /**
     * @private
     * @param {InitMessage} msg
     */
    onInit(msg) {
        this.active = true

        this.port.postMessage(
            {
                id: msg.id,
                type: this.MESSAGE_TYPE.INIT
            }
        )

        setImmediate(
            () => {
                if (this.sendQ.length) {
                    const sendQ = [...this.sendQ]

                    this.sendQ.length = 0

                    sendQ.forEach(
                        sendQItem => this._send(sendQItem)
                    )
                }
            }
        )
    }

    /**
     * @private
     * @param {SendMessage} msg
     */
    onSend(msg) {
        if (msg.confirm) {
            const hasBeenDelivered = this.confirm(msg.id, msg.confirmDuration)

            if (hasBeenDelivered) {
                return void 0
            }
        }

        this.root.emit(
            msg.event,
            {
                from: this.addressee,
                data: msg.data
            }
        )
    }

    /**
     * @private
     * @param {PostMessage} msg
     */
    onPost(msg) {
        this.root.emit(msg.event, 
            msg.msg,
            {
                from: this.addressee,
                /**
                 * @param {any} msg 
                 * @returns {void}
                 */
                answer: msg => this.answer(msg.id, msg)
            }
        )
    }

    /**
     * @private
     * @param {AnswerMessage} msg
     */
    onAnswer(msg) {
        if (this.answerQ.has(msg.id)) {
            const answerQItem = this.answerQ.get(msg.id)

            this.answerQ.delete(msg.id)
            
            clearTimeout(answerQItem.timeout)

            answerQItem.resolve(msg.msg)
        }
    }

    /**
     * @private
     * @param {ConfirmMessage} msg
     */
    onConfirm(msg) {
        if (this.confirmQ.has(msg.id)) {
            const confirmQItem = this.confirmQ.get(msg.id)

            this.confirmQ.delete(msg.id)

            clearTimeout(confirmQItem.timeout)
        }
    }

    destroy() {
        this.removeListeners()
        this.port.close()
    }
}


module.exports = Channel