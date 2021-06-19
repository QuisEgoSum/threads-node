

const ThreadError = module.exports = class ThreadError extends Error {
    constructor(message) {
        super(message)
    }
}

ThreadError.TimeoutHasExpired = class TimeoutHasExpired extends ThreadError {
    constructor() {
        super('Timeout has expired')
    }
}

ThreadError.BadOptions = class BadOptions extends ThreadError {
    constructor(message) {
        super(message)
    }
}

ThreadError.ThreadDeath = class ThreadDeath extends ThreadError {
    constructor(code, name, number) {
        super(`The thread finished its execution with code ${code}`)
        this.pool = name
        this.thread = number
    }
}