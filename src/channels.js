const Channel = require('./channel')
const {ThreadNotExist} = require('./error')
const {randomInt} = require('./helpers')


class Channels extends Map {

    /**
     * @param {MessagePort} tire 
     * @param {import('./main-thread').ChannelOptions} channelOptions 
     */
    constructor(tire, channelOptions) {
        super()
        /** @private */
        this._tire = tire
        /** @private */
        this._channelOptions = channelOptions
    }

    /**
     * @param {Map.<number, MessagePort>>} ports
     */
    init(name, ports, active = false) {
        if (this.size !== 0) {
            this.forEach(channel => channel.removeListeners())
            this.clear()
        }

        for (const [threadNumber, threadPort] of ports.entries()) {
            this.set(threadNumber, new Channel(this._tire, threadPort, this._channelOptions, active, {name, number: threadNumber}))
        }

        return this
    }

    /**
     * @param {Strings} event 
     * @param {*} message 
     * @param {Object} options 
     * @param {Number} options.delay
     * @param {'all'|'any'|Number} options.to
     * @returns {void}
     * @throws {WorkerNotExist}
     */
    send(event, message, {to = 'any', delay = this._channelOptions.delaySend} = {}) {
        if (to === 'all') {
            return this.forEach(channel => channel.send(event, message, delay))
        } else {
            return this._selectChannel(to).send(event, message, delay)
        }
    }

    /**
     * @async
     * @param {String} event 
     * @param {*} message 
     * @param {{delay: Number, to: 'any'|Number}} options 
     * @returns {Promise.<*>}
     * @throws {WorkerNotExist, ThreadNotActive, TimeoutHasExpired}
     */
    async post(event, message, {to = 'any', delay = this._channelOptions.delayPost} = {}) {
        return this._selectChannel(to).post(event, message, delay)
    }

    /**
     * @private
     * @param {'any'|Number} to
     * @returns {Channel}
     * @throws {WorkerNotExist}
     */
    _selectChannel(to) {
        if (this.size === 0) {
            throw new ThreadNotExist()
        }

        if (to === 'any') {
            return Array.from(this)[randomInt(this.size - 1)][1]
        } else {
            if (this.has(to)) {
                return this.get(to)
            } else {
                throw ThreadNotExist()
            }
        }
    }
}


module.exports = Channels