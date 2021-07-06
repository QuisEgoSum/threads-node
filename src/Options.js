


class MainThreadOptions {
    /**
     * 
     * @param {import('./MainThread').Options} options 
     */
    constructor(options) {
        this.TERMINATE_CODE = options.TERMINATE_CODE ?? 1984

        this.delay = {
            send:       options.delay.send      ?? 1000,
            post:       options.delay.post      ?? 200,
            ready:      options.delay.ready     ?? 5000,
            init:       options.delay.init      ?? 1000,
            destroy:    options.delay.destroy   ?? 1000
        }

        /**
         * @type {Map.<string, import('./MainThread').OptionsThread>}
         */
        this.threads = new Map()

        options.threads.forEach(thread => this.threads.set(thread.name, thread))

        for (const thread of options.threads) {
            if (!('messages' in thread)) {
                thread.messages = []
                continue
            }

            for (let r = 0; r < thread.messages.length; r++) {
                const recipientName = thread.messages[r]

                if (!this.threads.has(recipientName)) {
                    thread.messages.splice(r, 1)
                    r--
                    continue
                }

                const recipient = this.threads.get(recipientName)

                if (!('messages' in recipient)) {
                    recipient.messages = [thread.name]
                    continue
                }

                if (!recipient.messages.includes(thread.name)) {
                    recipient.messages.push(thread.name)
                }
            }
        }
    }
}


module.exports = {
    MainThreadOptions
}