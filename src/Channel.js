


class Channel {

    /**
     * @param {import('./MainThread').OptionsDelay} options 
     * @param {{name: String, number: Number}} recipient 
     * @param {import('./Thread')} root 
     */
    constructor(options, recipient, root) {
        this.active = false
        this._port = null

        this._root = root
        this._options = options
        this._recipient = recipient

        this._sendQ = new Array()
        this._checkQ = new Map()
        this._answerQ = new Map()
        this._readyQ = new Map()
    }

    init() {}

    send(msg, options) {}

    post(msg, options) {}

    addListeners(port) {

        return this
    }

    removeListeners() {}

    _check() {}

    _answer() {}

    _onMessage(msg) {}

    _onInit(msg) {}

    _onSend(msg) {}

    _onPost(msg) {}

    _onAnswer(msg) {}

    _onCheck(msg) {}
}


module.exports = Channel