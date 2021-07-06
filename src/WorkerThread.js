const {Worker} = require('worker_threads')
const Channel = require('./Channel')


class WorkerThread extends Channel {
    constructor() {
        super()
    }

    /**
     * @override
     */
    async init() {}

    /**
     * @override
     * @param {Number} delay 
     */
    async destroy(delay) {}
}


module.exports = WorkerThread