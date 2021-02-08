const {worker} = require('../index')
const {getTime} = require('./helper')


async function main() {

    worker.on('test post to first', (msg, ctx) => {
        console.log(`[${worker.name}-${worker.number}][${getTime()}][POST][FROM ${ctx.from.name}-${ctx.from.number}]`, msg)
        ctx.answer(`Answer from the first number ${worker.number}`)
    })

    worker.on('test send to first', (msg, ctx) => {
        console.log(`[${worker.name}-${worker.number}][${getTime()}][SEND][FROM ${ctx.from.name}-${ctx.from.number}]`, msg)
    })

    worker.on('terminate', async (ctx) => {
        await worker.to('master').send('test send to master', "I'm dying")
        ctx.end('Goodbye')
    })

    await worker.init()

    worker.to('second').send('test send to second', 'Message from the first to the second')
}


main()