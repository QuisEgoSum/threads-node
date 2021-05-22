const {isMainThread, workerData, parentPort} = require('worker_threads')


module.exports = {
    Error: require('./src/Error'),
    MainThread: isMainThread ? require('./src/MainThread') : null,
    thread: isMainThread ? null : new (require('./src/Thread'))(workerData, parentPort)
}