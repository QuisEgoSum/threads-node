const {createId} = require('./utils')


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
 * @property {import('./AThread')} root
 * 
 * @typedef SendQItem
 * @type {Object}
 * @property {MessageId} id 
 * @property {any} [msg]
 * @property {String} event 
 * @property {Number} delay 
 * @property {Array.<MessagePort>} [transferList]
 * 
 * @typedef SendQ
 * @type {Array.<SendQItem>}
 * 
 * @typedef CheckQItem
 * @type {Object}
 * @property {NodeJS.Timeout} timeout
 * 
 * @typedef {Map.<MessageId, CheckQItem>} CheckQ
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
 * @typedef SendMessageOptions
 * @type {Object}
 * @property {Number} [delay]
 * @property {String} [messageId]
 * @property {Array.<MessagePort>} [transferList]
 * 
 * @typedef PostMessageOptions
 * @type {Object}
 * @property {Number} [delay]
 * @property {String} [messageId]
 * @property {Array.<MessagePort>} [transferList]
 */


class Channel {

    /**
     * 
     * @param {ChannelOptions} param0 
     */
    constructor({delay, addressee, root}) {
        this.active = false

        this.MESSAGE_TYPE = {
            SEND: 'send',
            POST: 'post',
            ANSWER: 'answer',
            CHECK: 'check'
        }
        /**
         * @callback OnEvent
         * @param {String} event
         * @param {Function} callback
         * 
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
         * @type {CheckQ}
         */
        this.checkQ = new Map()

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

        this.answerQ.get('s').resolve()

        /**
         * @private
         */
        this.messageListener = (msg) => this.onMessage(msg)

        /**
         * @private
         */
        this.closedListener = () => void (this.active = false)
    }

    init() {}

    /**
     * 
     * @param {MessageEvent} event 
     * @param {Message} msg 
     * @param {SendMessageOptions} options 
     * @returns {Number}
     */
    send(event, msg, options) {

        options.delay = options.delay ?? this.delay.send
        options.messageId = options.messageId || createId()

        if (!this.active) {
            if (options.delay !== 0) {
                this.sendQ.push(
                    {
                        id: options.messageId,
                        msg: msg,
                        event: event,
                        transferList: options.transferList,
                        delay: options.delay
                    }
                )

                return 2
            }

            return 0
        }

        this.port.postMessage(
            {
                id: options.messageId,
                type: this.MESSAGE_TYPE.SEND,
                event: event,
                msg: msg
            }
        )

        if (options.delay > 0) {
            this.checkQ.set(options.messageId, 
                {
                    timeout: setTimeout(
                        () => setImmediate(
                            () => {
                                if (this.checkQ.has(options.messageId)) {
                                    process.nextTick(
                                        () => this.send(
                                            event,
                                            msg,
                                            options
                                        )
                                    )
                                }
                            }
                        )
                    )
                }
            )
        }

        return 1
    }

    /**
     * 
     * @param {String} event 
     * @param {Message} msg 
     * @param {PostMessageOptions} options 
     */
    post(event, msg, options) {}

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
     * @private
     */
    check() {}

    /**
     * @private
     */
    answer() {}

    /**
     * @private
     */
    onMessage(msg) {}

    /**
     * @private
     */
    onInit(msg) {}

    /**
     * @private
     */
    onSend(msg) {}

    /**
     * @private
     */
    onPost(msg) {}

    /**
     * @private
     */
    onAnswer(msg) {}

    /**
     * @private
     */
    onCheck(msg) {}
}


module.exports = Channel