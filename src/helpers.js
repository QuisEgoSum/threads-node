const {MessageChannel} = require('worker_threads')
const crypto = require('crypto')


const createId = () => crypto.randomBytes(16).toString('hex')

class UpdatePort {

    /** @param {String} name @param {Number} number */
    constructor(name, number) {
        this.name = name
        this.number = number
        /** @type {MessagePort[]} */
        this.transferList = []
        /** @type {{name: String, number: Number, port: MessagePort}} */
        this.port = {}
    }

    /** @param {String} name @param {Number} number @param {MessagePort} port */
    setPort(name, number, port) {
        this.port.name = name
        this.port.number = number
        this.port.port = port
        this.transferList.push(port)
        return this
    }

    toJSON() {
        return [this.port, this.transferList]
    }
}

class WorkerOptions {

    /**
     * @constructor
     * @param {String} name 
     * @param {String} number 
     * @param {Array.<String>} messages 
     * @param {*} workerData 
     * @param {{rejectDelaySend: Number, rejectDelayPost: Number, internalRejectDelay: Number}} delayOptions
     * @param {Boolean} isExchangeMaster
     */
    constructor(name, number, messages, workerData, {rejectDelaySend, rejectDelayPost, internalRejectDelay}) {

        this.name = name
        this.number = number
        this.messages = messages
        this.data = workerData
        this.rejectDelayPost = rejectDelayPost
        this.rejectDelaySend = rejectDelaySend
        this.internalRejectDelay = internalRejectDelay
        this.ports = {}
        this.transferList = []
        this.masterPort = null

        for (const workerName of messages)
            this.ports[workerName] = {}

        //tmp
        const {port1, port2} = new MessageChannel()
        this.ports.master = {1: port1}
        this.transferList.push(port1)
        this.masterPort = port2
    }

    /**
     * @param {WorkerOptions|UpdatePort} workerOptions
     * @returns {undefined|UpdatePort}
     */
    portExchange(workerOptions){
        const {port1, port2} = new MessageChannel()

        if (workerOptions instanceof WorkerOptions) {
            this.ports[workerOptions.name][workerOptions.number] = port2
            this.transferList.push(port2)
            workerOptions.ports[this.name][this.number] = port1
            workerOptions.transferList.push(port1)
        } else if (workerOptions instanceof UpdatePort) {
            this.ports[workerOptions.name][workerOptions.number] = port2
            this.transferList.push(port2)
            return workerOptions.setPort(this.name, this.number, port1)
        }
    }

    toJSON() {
        return [
            {
                name: this.name,
                number: this.number,
                messages: this.messages,
                data: this.data,
                rejectDelayPost: this.rejectDelayPost,
                rejectDelaySend: this.rejectDelaySend,
                internalRejectDelay: this.internalRejectDelay,
                ports: this.ports
            },
            this.transferList,
            this.masterPort
        ]
    }
}


module.exports = {WorkerOptions, UpdatePort, createId}