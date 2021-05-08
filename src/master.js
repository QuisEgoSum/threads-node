const Thread = require('./thread')
const WorkerWrapper = require('./worker-wrapper')
const {WorkerOptions, UpdatePort} = require('./helpers')
const {FailedRevive} = require('./error')


class Master extends Thread {
    /**
     * 
     * @typedef WorkerOptionsConstructor
     * @type {Object}
     * @property {String} entry Absolute path to the file
     * @property {String} name Name of the worker group
     * @property {Number} [numberOfInstance] Number of workers
     * @property {Array.<String>} [messages] Names of worker groups for channel exchange
     * @property {any} [workerData]
     * 
     * @param {Object} configuration
     * @param {WorkerOptionsConstructor[]} configuration.workers
     * @param {Number} configuration.rejectDelayPost 
     * The default value of the promise rejection for sending messages by the post method.
     * Default 100ms
     * @param {Number} configuration.rejectDelaySend 
     * Delay before resending the message using the send method if there is no confirmation of delivery.
     * Default 100ms
     * @param {Number} configuration.internalRejectDelay
     * The number of milliseconds of waiting for a response from the workers when transmitting initializing messages and exchanging channels after the fall of one of the workers.
     * It hardly makes sense to specify a different value.
     * Default 100 ms
     * @param {Number} configuration.maxFailedAttemptsRaise
     * The maximum number of failed attempts to revive the worker, after which all attempts will be terminated.
     * An error of the "Failed Revive" type is thrown.
     * Applies only to errors that occur after the initialization of the "Master".
     * Default 4.
     * @param {Number} configuration.numberDeathsForTerminateProcess
     * The number of worker deaths in a row after which the process should be terminated (throw an error, not through the "error" event).
     * Time period for counting - durationDeathCountTime
     * If 0 is specified, do not terminate the process.
     * Default 4.
     * @param {Number} configuration.durationDeathCountTime
     * The number of milliseconds during which the number of worker deaths is counted. For correctness,
     * you should take into account the duration of loading modules in the workers and the time of connecting 
     * to the database, if there is such a thing.
     * Default 2000 ms
     * @param {Number} configuration.delayStartingWorker
     * The amount of time after which, if there is no response from the worker, 
     * the wizard will terminate the process. You should take into account the 
     * synchronous loading of modules, because of which the worker will not be able to process messages at startup.
     * Default 4000 ms
     */
    constructor({
        workers,
        rejectDelayPost = 100,
        rejectDelaySend = 100,
        internalRejectDelay = 100,
        maxFailedAttemptsRaise = 4,
        numberDeathsForTerminateProcess = 4,
        durationDeathCountTime = 2000,
        delayStartingWorker = 4000
    }) {

        super()

        this._maxFailedAttemptsRaise = maxFailedAttemptsRaise
        this._delayOptions = {rejectDelayPost, rejectDelaySend, internalRejectDelay}
        
        /** @type {{entry: String, name: String, number: Number, messages: Array.<String>, numberOfInstance: Number, workerData: *, isExchangeRelated: Boolean}[]} */
        this._optionsWorkers = workers

        for (const currentOptions of this._optionsWorkers) {

            if (!('numberOfInstance' in currentOptions))
                currentOptions.numberOfInstance = 1

            if (!('messages' in currentOptions))
                currentOptions.messages = []

            currentOptions.isExchangeRelated = false

            if (currentOptions.messages.length) {

                for (let q = 0; q < currentOptions.messages.length; q++) {

                    const currentTargetName = currentOptions.messages[q]

                    if (currentOptions.name === currentTargetName) {
                        currentOptions.isExchangeRelated = true
                        continue
                    }

                    const currentTarget = this._optionsWorkers.find(({name}) => name === currentTargetName)

                    if (!currentTarget) {
                        currentOptions.messages.splice(q, 1)
                        q--
                        continue
                    }

                    if (!('messages' in currentTarget))
                        currentTarget.messages = []

                    if (!currentTarget.messages.includes(currentOptions.name))
                        currentTarget.messages.push(currentOptions.name)
                }
            }
        }

        this._init({numberDeathsForTerminateProcess, durationDeathCountTime, delayStartingWorker})
    }

    async _init(otherOptions) {

        /** @type {Object.<string, Object.<number, WorkerOptions>>} */
        const options = {}

        /** Creating a configuration object to pass to the worker. Exchange of channels. */

        for (const {name, numberOfInstance, messages, isExchangeRelated, entry, workerData} of this._optionsWorkers) {

            options[name] = {}
            const workers = new Map()
            for (let number = 1; number <= numberOfInstance; number++) {
                options[name][number] = new WorkerOptions(name, number, messages, workerData, this._delayOptions)
                workers.set(number, new WorkerWrapper(this, this._emitter, name, number, entry, {...this._delayOptions, ...otherOptions}))
            }

            /** Exchange of channels between related workers, if necessary. */
            if (isExchangeRelated) {
                for (let current = 1; current <= numberOfInstance; current++) {
                    for (let next = current + 1; next <= numberOfInstance; next++) {
                        options[name][current].portExchange(options[name][next])
                    }
                }
            }

            this._workers.set(name, workers)
        }

        /** Then between different groups of workers, as specified in the "messages" arrays. */

        /**
         * To avoid double sending of channels, we remember who was given what.
         * @type {Object.<string, Array.<String>}
         */
        const exchanged = {}

        for (const {name: currentName, messages} of this._optionsWorkers) {

            if (!messages.length)
                continue

            if (!exchanged[currentName])
                exchanged[currentName] = []

            for (const targetName of messages) {
                if (targetName === currentName)
                    continue

                if (!exchanged[targetName])
                    exchanged[targetName] = []
                else if (exchanged[currentName].includes(targetName) || exchanged[targetName].includes(currentName))
                    continue

                exchanged[currentName].push(targetName)
                exchanged[targetName].push(currentName)

                for (const currentWorkerNumber in options[currentName]) {
                    for (const nextWorkerNumber in options[targetName]) {
                        options[currentName][currentWorkerNumber].portExchange(options[targetName][nextWorkerNumber])
                    }
                }
            }
        }

        const promises = []

        this._workers.forEach(workers => workers.forEach(worker => void promises.push(worker.run(...options[worker.name][worker.number].toJSON()))))

        await Promise.all(promises)

        promises.length = 0

        this._workers.forEach(workers => workers.forEach(worker => void promises.push(worker.internalPost('init'))))

        await Promise.all(promises)

        this.inited = true

        this._emitter.emit('init')
    }

    /** 
     * @param {String} name 
     * @param {Number} number 
     * @param {Number} [attempts] The current nuber of attempt
     * @throws  {DeathBeforeInitialization, FailedRevive}
     */
    async restartWorker(name, number, attempts = 1) {
        try {

            const sourceOptionsDeceased = this._optionsWorkers.find(({name: _name}) => name === _name)

            const options = new WorkerOptions(name, number, sourceOptionsDeceased.messages, sourceOptionsDeceased.workerData, this._delayOptions)

            /**
             * @type {Object.<string, Object.<number, UpdateOptions>>}
             */
            const updateWorkers = {}

            for (const {name: currentName, numberOfInstance} of this._optionsWorkers) {

                if (!sourceOptionsDeceased.messages.includes(currentName))
                    continue

                updateWorkers[currentName] = {}

                for (let currentNumber = 1; currentNumber <= numberOfInstance; currentNumber++) {

                    if (currentName === name && currentNumber === number)
                        continue

                    updateWorkers[currentName][currentNumber] = options.portExchange(new UpdatePort(currentName, currentNumber))
                }
            }

            const worker = this._workers.get(name).get(number)

            const promises = []

            for (const workersName in updateWorkers) {
                for (const workerNumber in updateWorkers[workersName]) {
                    promises.push(this._workers.get(workersName).get(Number(workerNumber)).internalPost('channel', ...updateWorkers[workersName][workerNumber].toJSON()))
                }
            }

            await Promise.all(promises)

            await worker.run(...options.toJSON())

            await worker.internalPost('init')

        } catch(error) {
            error.label = 'restart worker'
            error.workerName = name
            error.workerNumber = number
            this._emitter.emit('error', error)
            if (attempts < this._maxFailedAttemptsRaise)
                return this.restartWorker(name, number, attempts + 1)
            else
                throw new FailedRevive(name, number, attempts)
        }
    }

    /**
     * Destroys all threads. Before being destroyed, the "terminate" event is generated in the threads.
     * @async
     * @param {Number} delay 
     * The maximum time for a worker to complete something before being destroyed.
     * Default 1000ms.
     * @returns {Promise.<Array.<{ok: Number, message: String, workerName: String, workerNumber: String}>>}
     */
    async terminateAll(delay = 1000) {

        const promises = []

        this._workers.forEach(workers => workers.forEach(worker => void promises.push(worker.terminate(delay))))

        return (await Promise.allSettled(promises)).map(item => item.reason ? item.reason : item.value)
    }
}


module.exports = Master