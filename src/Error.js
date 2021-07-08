

class ThreadError extends Error {
    constructor(message) {
        super(message)
    }
}

ThreadError.TimeoutHasExpired = class TimeoutHasExpired extends ThreadError {
    /**
     * @param {import('./Channel').Addressee} addressee 
     */
    constructor(addressee) {
        super('Timeout has expired')
        this.name = addressee.name
        this.number = addressee.number
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

ThreadError.ThreadPoolNotExists = class ThreadPoolNotExists extends ThreadError {
    constructor(name) {
        super(`The ${name} thread pool not exists`)
        this.name = name
    }
}

ThreadError.ThreadNotExists = class ThreadNotExists extends ThreadError {
    constructor(name, number) {
        super(`The ${name} ${number} thread not exists`)
        this.name = name
        this.number = number
    }
}


module.exports = ThreadError