const Channels = require('./channels')
const Channel = require('./channel')
const {Worker} = require('worker_threads')


class ThreadExit {
    constructor(name, number, code) {
        this.message = `Thread ${name} number ${number} has stopped. Exit code ${code}`
        this.name = name
        this.number = number
        this.code = code
    }
}

class WorkerThread extends Channel {

    /**
     * @param {import('./main-thread').ThreadOptions & {number: Number}} options
     * @param {Function} tire 
     * @param {import('./main-thread').MainThreadOptions} channelOptions 
     */
    constructor(tire, options, channelOptions) {
        super(tire, null, channelOptions)
        this.options = options
        this.active = true
    }

    get name() {
        return this.options.name
    }

    get number() {
        return this.options.number
    }

    /**
     * @param {Map.<string, Map.<number, MessagePort>>} ports
     */
    run(ports) {

        this.removeListeners()

        const transferList = []

        ports.forEach(_ports => _ports.forEach(port => transferList.push(port)))

        this._cord = new Worker(this.options.entry, {
            ...this.options.options,
            transferList: transferList,
            workerData: {
                data: this.options.data,
                ports: ports,
                channelOptions: this._options,
                options: {
                    name: this.name,
                    number: this.number
                }
            }
        })

        this.addListeners()
    }

    setPorts(ports) {

        const transferList = []

        ports.forEach(_ports => _ports.forEach(port => transferList.push(port)))

        this.send('#channels', ports, void 0, void 0, transferList)

    }

    /**
     * @override
     * @param {MessagePort} cord 
     */
    addListeners() {
        this._cord.on('error', (...args) => this._error('error', ...args))
        this._cord.on('messageerror', (...args) => this._error('messageerror', ...args))
        this._cord.on('exit', (...args) => this._exit(...args))
        this._cord.on('message', (...args) => this._message(...args))
    }

    /**
     * @override
     */
    removeListeners() {
        if (this._cord) {
            this._cord.removeAllListeners('error')
            this._cord.removeAllListeners('messageerror')
            this._cord.removeAllListeners('exit')
            this._cord.removeAllListeners('message')
        }
    }

    /**
     * @private
     * @param {Number} workerNumber 
     * @param {'error'|'errormessage'} eventName 
     * @param {Error} error 
     */
    _error(eventName, error) {
        error.thread = {
            name: this.name,
            number: this.number,
            event: eventName
        }
        this._tire('error', error)
    }

    /**
     * @private
     * @param {Number} number 
     * @param {Number} code 
     */
    _exit(code) {
        this._tire('exit', new ThreadExit(this.name, this.number, code))
    }
}

class ThreadPool extends Channels {

    /**
     * @param {Function} tire 
     * @param {import('./main-thread').ThreadOptions} options 
     * @param {import('./main-thread').ChannelOptions} channelOptions 
     */
    constructor(tire, options, channelOptions) {

        super(tire, channelOptions)

        /** @private */
        this._options = options

        for (let n = 1; n <= this._options.numberOf; n++) {
            this.set(n, new WorkerThread(this._tire, {...this._options, number: n}, this._channelOptions))
        }
    }

    get name() {
        return this._options.name
    }

    get numberOf() {
        return this._options.numberOf
    }

    get messages() {
        return this._options.messages
    }

    /**
     * @override
     * @param {Map.<number, Map.<string, Map.<number, MessagePort>>>} ports
     * @returns {this}
     */
    init(ports) {

        if (this.size !== 0) {
            // await this.terminate()
        }

        this.forEach(/** @param {WorkerThread} thread */thread => thread.run(ports.get(thread.number)))

        return this
    }

    // /**
    //  * @param {Number} number 
    //  * @param {Object.<string, MessagePort>} ports 
    //  * @throws {WorkerNotExist}
    //  */
    // async restart(number, ports) {
    //     if (!this.has(number)) {
    //         if (number >= this.numberOf && number < 0) {
    //             throw new WorkerNotExist()
    //         }
    //     } else {
    //         const worker = this.get(number)
    //         worker.removeListeners()
    //         if (!worker.active) {
    //             await worker.terminate()
    //         }
    //     }

    //     return this._run(number, ports)
    // }

    // async _run(number, ports) {

    //     const worker = new Worker(this._tire, ports, this._workerOptions, this._channelOptions)

    //     this.set(number, worker)

    //     // return new Promise((resolve) => worker.)
    // }

    // /**
    //  * @param {*} number 
    //  * @param {Object.<string, Map.<number, MessagePort>>} ports 
    //  */
    // async replacePorts(number, ports) {}

    // async terminate(maxDelay) {}
}


module.exports = ThreadPool