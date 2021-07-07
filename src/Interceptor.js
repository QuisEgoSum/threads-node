const ThreadError = require('./Error')
const utils = require('./utils')


class Interceptor {

    /**
     * @param {String} target 
     * @param {import('./MainThread')|import('./Thread')} root 
     */
    constructor(target, root) {
        /**
         * @private
         */
        this.root = root

        /**
         * @private
         * @type {Map.<String, Set.<Number>>}
         */
        this.targets = new Map()

        /**
         * @private
         * @type {String}
         */
        this.lastTarget = null

        this.and(target)
    }

    /**
     * @param {String} name 
     * @throws {ThreadError.ThreadPoolNotExists} 
     */
    and(name) {
        if (this.root.has(name)) {
            this.lastTarget = name

            this.targets.set(name, new Set(this.root.get(name).numbers))

            return this
        } else {
            throw new ThreadError.ThreadPoolNotExists(name)
        }
    }

    /**
     * @param {Array.<Number>} numbers 
     */
    not(...numbers) {
        const targetNumbers = this.targets.get(this.lastTarget)

        numbers.forEach(number => targetNumbers.delete(number))

        return this
    }

    /**
     * @param {Array.<Number>} numbers 
     */
    only(...numbers) {
        const target = this.root.get(this.lastTarget)

        for (const number of numbers) {
            if (!target.has(number)) {
                throw new ThreadError.ThreadPoolNotExists(this.lastTarget)
            }
        }

        this.targets.set(this.lastTarget, new Set(numbers))

        return this
    }

    any() {
        const targetNumbers = this.targets.get(this.lastTarget)

        const anyNumber = Array.from(targetNumbers)[utils.randomInt(targetNumbers.size - 1, 0)]

        this.targets.set(this.lastTarget, new Set([anyNumber]))

        return this
    }

    /**
     * @param {String} event
     * @param {any} message 
     * @param {import('./Channel').SendOptions} options 
     */
    send(event, message, options) {
        const result = []

        for (const [name, numbers] of this.targets.entries()) {
            result.push(
                {
                    name: name,
                    result: this.root.get(name).send(event, message, Array.from(numbers), options)
                }
            )
        }

        return result
    }

    async post() {}
}


module.exports = Interceptor