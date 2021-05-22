const Channel = require('./Channel')


class ChannelNode extends Map {

    /**
     * @param {Map.<Number, MessagePort>} node
     * @param {*} options 
     * @param {*} root 
     */
    constructor(name, node, options, root) {
        super()

        this.name = name

        const getRecipient = (number) => ({name, number})

        node
            .forEach(
                (port, number) => this
                    .set(number, new Channel(options, getRecipient(number), root)
                        .addListeners(port))
            )
    }

    init() {}

    post(message, options) {}

    send(message, options) {}

    remove() {}
}


module.exports = ChannelNode