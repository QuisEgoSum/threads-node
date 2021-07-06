const ChannelNode = require('./ChannelNode')


class ThreadPool extends ChannelNode {
    constructor() {
        super()
    }

    /**
     * @override
     */
    async init() {}

    /**
     * @param {Number} number 
     * @param {Number} delay 
     */
    async remove(number, delay) {}

    /**
     * @param {Number} delay 
     */
    async destroy(delay) {}
}


module.exports = ThreadPool