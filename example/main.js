const {MainThread, Error: ThreadError} = require('../index')
const {getTime} = require('./helper')


async function main() {


    const thread = await new MainThread({
        threads: [
            {name: 'first', numberOf: 2, entry: __dirname + '/first.js', messages: ['second', 'first']},
            {name: 'second', entry: __dirname + '/second.js', messages: ['first']},
            // {name: 'tree', numberOf: 4, entry: __dirname + '/second.js', messages: ['second', 'first', 'tree']}
        ],
        delaySend: 1000,
        delayPost: 1000
    })
        .on('error', error => {
            console.error(error)
            if (error instanceof ThreadError.DeathBeforeInitialization) {
                // thread.terminate
                process.exit(1)
            }
        })
        .on('exit', console.log)
        .init()

    console.log('INITED', getTime())

    thread.on('test send to master', (msg, ctx) => console.log(`[MASTER][${getTime()}][SEND][FROM ${ctx.from.name}-${ctx.from.number}]`, msg))

    thread.to('first').send('test send to first', 'Message from the master to the first')

    thread.to('second').post('test post to second', 'Message from the master to the second', 30)
        .then(answer => console.log(`[MASTER][${getTime()}][ANSWER]`, answer))
        .catch(error => console.error(`[MASTER][${getTime()}][ANSWER]`, error))

    thread.to('second').send('err')

    process.on('SIGINT', async () => {
        
        process.stdout.write('\r')
        console.log('by')
        // const results = await thread.terminateAll(1000)
        // results.forEach(result => console.log(result))
        process.exit(0)
    })
}


main().catch(err => console.error(1, err))