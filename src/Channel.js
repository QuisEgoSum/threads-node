

/**
 * @typedef {String} MessageId
 * 
 * @typedef Addressee
 * @type {Object}
 * @property {String} name
 * @property {Number} number
 * 
 * @typedef SendQItem
 * @type {Object}
 * @property {MessageId} id 
 * @property {*} [message]
 * @property {String} event 
 * @property {Number} delay 
 * @property {Array.<MessagePort>} [transferList]
 * 
 * @typedef SendQ
 * @type {Array}
 * 
 * @typedef CheckQItem
 * @type {Object}
 * @property {setTimeout} timeout
 * 
 * @typedef {Map.<MessageId, CheckQItem>} CheckQ
 * 
 * @typedef AnswerQItem
 * @type {Object}
 * @property {setTimeout} timeout
 * @property {Fuction} resolve promise resolve function
 * 
 * @typedef {Map.<MessageId>} AnswerQ
 * 
 * @typedef ReadyQItem
 * @type {Object}
 * @property {setTimeout} timeout
 * 
 * @typedef {Map.<MessageId, ReadyQItem>} ReadyQ
 */


class Channel {

    /**
     * @param {import('./MainThread').OptionsDelay} options 
     * @param {Addressee} addressee 
     * @param {import('./Thread')} root 
     */
    constructor(options, addressee, root) {
        this.active = false
        /**
         * @private
         * @type {MessagePort}
         */
        this._port = null

        /**
         * @private
         * @type {import('./Thread')}
         */
        this._root = root

        /**
         * @private
         */
        this._options = options

        /**
         * @private
         */
        this._addressee = addressee

        /**
         * @private
         * @type {SendQ}
         */
        this._sendQ = new Array()

        /**
         * @private
         * @type {CheckQ}
         */
        this._checkQ = new Map()

        /**
         * @private
         * @type {AnswerQ}
         */
        this._answerQ = new Map()

        /**
         * @private
         * @type {ReadyQ}
         */
        this._readyQ = new Map()
    }

    init() {}

    send(msg, options) {}

    post(msg, options) {}

    addListeners(port) {
        return this
    }

    removeListeners() {
        if (this._port) {
            ;['close'].forEach(event => this._port.removeAllListeners(event))
        }
    }

    /**
     * @private
     */
    _check() {}

    /**
     * @private
     */
    _answer() {}

    /**
     * @private
     */
    _onMessage(msg) {}

    /**
     * @private
     */
    _onInit(msg) {}

    /**
     * @private
     */
    _onSend(msg) {}

    /**
     * @private
     */
    _onPost(msg) {}

    /**
     * @private
     */
    _onAnswer(msg) {}

    /**
     * @private
     */
    _onCheck(msg) {}
}


module.exports = Channel