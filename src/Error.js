

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
        super(`The ${name} ${number} thread finished its execution with code ${code}`)
        this.code = code
        this.name = name
        this.number = number
    }
}

ThreadError.ThreadDeathBeforeInitialization = class ThreadDeath extends ThreadError {
    constructor(code, name, number) {
        super(`The ${name} ${number} thread finished its execution with code ${code} before initialization`)
        this.code = code
        this.name = name
        this.number = number
    }
}

ThreadError.ThreadNotActive = class ThreadNotActive extends ThreadError {
    constructor(name, number) {
        super(`The ${name} ${number} thread not active`)
        this.name = name
        this.number = number
    }
}