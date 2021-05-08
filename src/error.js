

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

class DeathBeforeInitialization extends ThreadsNodeError {
    constructor(name, number, code) {
        super(`The worker ${name} number ${number} died before the initialization process was completed. Exit code ${code}`)
    }
}

class FailedRevive extends ThreadsNodeError {
    constructor(name, number, attempts) {
        super(`Failed to revive the worker ${name} number ${number} with ${attempts} attempts.`)
    }
}

class ThreadNotActive extends ThreadsNodeError {
    constructor() {
        super(`The current worker is not active`)
    }
}

class ThreadNotExist extends ThreadsNodeError {
    constructor() {
        super('Worker Not Exist')
    }
}

// class ExceededDeathsCount extends ThreadsNodeError {
//     constructor(name, number, numberDeaths, numberDeathsAll, duration) {
//         super(`The worker ${name} number ${number} died ${numberDeaths} in a period of ${duration} ms. Total number of deaths for all time ${numberDeathsAll}.`)
//         this.name = name
//         this.number = number
//         this.numberDeaths = numberDeaths
//         this.numberDeathsAll = numberDeathsAll
//     }
// }

// class ExceededDelayStartThread extends ThreadsNodeError {
//     constructor(name, number, delay) {
//         super(`Exceeded the delay for the start of the worker ${name} number ${name}. Parameter delayStartingWorker ${delay} ms`)
//         this.name = name
//         this.number = number
//     }
// }


module.exports = ThreadsNodeError
module.exports.TimeoutHasExpired = TimeoutHasExpired
module.exports.DeathBeforeInitialization = DeathBeforeInitialization
module.exports.FailedRevive = FailedRevive
module.exports.ThreadNotActive = ThreadNotActive
module.exports.ThreadNotExist = ThreadNotExist
// module.exports.ExceededDeathsCount = ExceededDeathsCount
// module.exports.ExceededDelayStartWorker = ExceededDelayStartThread