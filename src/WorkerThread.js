const {Worker} = require('worker_threads')
const Channel = require('./Channel')


class WorkerThread extends Channel {
    constructor() {
        super()
    }

    /**
     * @override
     */
    init() {
        
    }
}


module.exports = WorkerThread