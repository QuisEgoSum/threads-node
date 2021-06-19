const {EventEmitter} = require('events')



class AThread extends EventEmitter {
    constructor() {
        super()
        
        this.inited = false

        this.children = new Map()
    }

    to() {}
}



module.exports = AThread