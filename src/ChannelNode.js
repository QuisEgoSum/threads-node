const Channel = require('./Channel')
const ThreadError = require('./Error')


/**
 * @typedef Addressees
 * @type {Object}
 * @property {String} name
 * @property {Array.<Number>} numbers
 * 
 * @typedef ChannelNodeConstuctorOptions
 * @type {Object}
 * @property {import('./MainThread').OptionsDelay} delay
 * @property {import('./Thread')} root
 * @property {Addressees} addressees
 * 
 * @typedef PostResult
 * @type {Object}
 * @property {0|1} ok
 * @property {Number} number
 * @property {Channel.AnswerEvent} [result]
 * @property {ThreadError.ThreadNotActive|ThreadError.TimeoutHasExpired|ThreadError.ThreadNotExists} [error]
 * 
 * @typedef PostResults
 * @type {Object}
 * @property {Number} ok
 * @property {Number} errors
 * @property {Array.<PostResult>} results
 */

class ChannelNode {

    /**
     * @param {ChannelNodeConstuctorOptions} options 
     */
    constructor({delay, root, addressees}) {
        /**
         * @private
         */
        this.delay = delay

        /**
         * @private
         */
        this.root = root

        /**
         * @private
         */
        this.addressees = addressees

        /**
         * @private 
         * @type {Map.<Number, Channel>}
         */
        this.children = new Map()
    }

    /**
     * @param {Number} number 
     * @returns {Channel}
     * @throws {ThreadError.ThreadNotExists}
     */
    get(number) {
        if (this.has(number)) {
            return this.children.get(number)
        } else {
            throw new ThreadError.ThreadNotExists(this.addressees.name, number)
        }
    }

    /**
     * @param {Number} number 
     * @returns {Boolean}
     */
    has(number) {
        return this.children.has(number)
    }

    get numbers() {
        return [...this.addressees.numbers]
    }

    /**
     * @returns {Promise.<void>}
     * @throws {ThreadError.TimeoutHasExpired}
     */
    async init() {
        this.addressees.numbers.forEach(number => this.appendChannel(number))

        const promises = new Array()

        for (const channel of this.children.values()) {
            promises.push(channel.init())
        }

        await Promise.all(promises)
    }

    /**
     * @param {Number} number 
     */
    appendChannel(number) {
        if (!this.has(number)) {
            this.children.set(number, new Channel(
                {
                    delay: this.delay,
                    addressee: {
                        number,
                        name: this.addressees.name
                    },
                    root: this.root
                }
            ))

            return true
        }

        return false
    }

    /**
     * @param {Number} number 
     * @param {MessagePort} port 
     */
    setPort(number, port) {
        this.get(number).setPort(port)
    }

    /**
     * @param {Channel.PostOptions} options 
     * @param {Array.<Number>} numbers 
     * @returns {Promise.<PostResults>}
     */
    async post(options, ...numbers) {
        const promises = []

        for (const number of numbers) {
            promises.push(this._post(options, number))
        }

        const results = await Promise.all(promises)

        const ok = results.filter(result => result.ok).length
        const errors = results.length - ok

        return {
            ok: ok,
            errors: errors,
            results
        }
    }

    /**
     * @private 
     * @param {Channel.PostOptions} options 
     * @param {Number} number 
     * @returns {Promise.<PostResult>}
     */
    async _post(options, number) {
        try {
            const result = await this.get(number).post(options)

            return {
                ok: 1,
                number: number,
                result: result
            }
        } catch (error) {
            return {
                ok: 0,
                number: number,
                error: error
            }
        }
    }

    /**
     * @param {Channel.SendOptions} options 
     * @param {Array.<Number>} numbers
     * @returns {Array.<{number: Number, result: 0|1|2}>}
     */
    send(options, ...numbers) {
        return numbers.map(number => {
            return {
                number,
                result: this.children.get(number).send(options)
            }
        })
    }

    /**
     * @param {Number} number 
     */
    remove(number) {
        this.get(number).destroy()

        this.children.delete(number)
    }

    destroy() {
        this.children.forEach(channel => channel.destroy())

        this.children.clear()
    }
}


module.exports = ChannelNode