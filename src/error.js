

class ThreadsNodeError extends Error {
    constructor(...args) {
        super(...args)
    }
}

class TimeoutHasExpired extends ThreadsNodeError {
    constructor() {
        super('Timeout has expired')
    }
}

class InternalTimeoutHasExpired extends ThreadsNodeError {
    constructor() {
        super('Internal timeout has expired')
    }
}

class DeathBeforeInitialization extends ThreadsNodeError {
    constructor(name, number) {
        super(`The worker ${name} number ${number} died before the initialization process was completed`)
    }
}

class FailedRevive extends ThreadsNodeError {
    constructor(name, number, attempts) {
        super(`Failed to revive the worker ${name} number ${number} with ${attempts} attempts.`)
    }
}

class WorkerNotActive extends ThreadsNodeError {
    constructor() {
        super(`The current worker is not active`)
    }
}

class WorkerNotExist extends ThreadsNodeError {
    constructor(message) {
        super(message)
    }
}

class ThreadExit extends ThreadsNodeError {
    constructor(name, number, code) {
        super(`Worker ${name} number ${number} has stopped. Exit code ${code}`)
        this.workerName = name
        this.workerNumber = number
        this.exitCode = code
    }
}

class ExceededDeathsCount extends ThreadsNodeError {
    constructor(name, number, numberDeaths, numberDeathsAll, duration) {
        super(`The worker ${name} number ${number} died ${numberDeaths} in a period of ${duration} ms. Total number of deaths for all time ${numberDeathsAll}.`)
        this.workerName = name
        this.workerNumber = number
        this.numberDeaths = numberDeaths
        this.numberDeathsAll = numberDeathsAll
    }
}

class ExceededDelayStartWorker extends ThreadsNodeError {
    constructor(name, number, delay) {
        super(`Exceeded the delay for the start of the worker ${name} number ${name}. Parameter delayStartingWorker ${delay} ms`)
        this.workerName = name
        this.workerNumber = number
    }
}


module.exports = ThreadsNodeError
module.exports.TimeoutHasExpired = TimeoutHasExpired
module.exports.InternalTimeoutHasExpired = InternalTimeoutHasExpired
module.exports.DeathBeforeInitialization = DeathBeforeInitialization
module.exports.FailedRevive = FailedRevive
module.exports.WorkerNotActive = WorkerNotActive
module.exports.WorkerNotExist = WorkerNotExist
module.exports.ThreadExit = ThreadExit
module.exports.ExceededDeathsCount = ExceededDeathsCount
module.exports.ExceededDelayStartWorker = ExceededDelayStartWorker