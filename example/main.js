const {Master} = require('../index')
const {getTime} = require('./helper')


async function main() {
    
    const master = new Master({
        workers: [
            {name: 'first', numberOfInstance: 2, entry: __dirname + '/first.js', messages: ['second', 'first']},
            {name: 'second', entry: __dirname + '/second.js', messages: ['first']}
        ],
        rejectDelayPost: 50,
        rejectDelaySend: 100,
    })

    master.on('error', console.error)

    master.on('test send to master', (msg, ctx) => console.log(`[MASTER][${getTime()}][SEND][FROM ${ctx.from.name}-${ctx.from.number}]`, msg))

    master.on('init', () => {
        master.to('first').send('test send to first', 'Message from the master to the first')

        master.to('second').post('test post to second', 'Message from the master to the second', 30)
            .then(answer => console.log(`[MASTER][${getTime()}][ANSWER]`, answer))
            .catch(error => console.error(`[MASTER][${getTime()}][ANSWER]`, error))

        master.to('second').send('err')
    })

    process.on('SIGINT', async () => {
        process.stdout.write('\r')
        const results = await master.terminateAll(1000)
        results.forEach(result => console.log(result))
        process.exit(0)
    })
}


main()