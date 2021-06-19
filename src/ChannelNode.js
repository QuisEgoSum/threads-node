const Channel = require('./Channel')


class ChannelNode extends Map {

    /**
     * @param {import('./MainThread').ChannelNodeOptions} nodeOptions 
     * @param {import('./Thread')} root 
     */
    constructor(nodeOptions, root) {
        super()

        this._options = nodeOptions
        this._root = root
    }

    _init() {
        for (let number = 1; number <= this._options.number; number++) {
            this.set(new Channel(this._options.delay, {number, name: this._options.name}, this._root))
        }
    }

    init() {

    }

    post(message, options) {}

    send(message, options) {}

    remove() {}
}


module.exports = ChannelNode