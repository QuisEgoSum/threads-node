const {getTime} = require('./helper')
const {worker} = require('../index')


async function main() {

    worker.on('test post to second', (msg, ctx) => {
        console.log(`[${worker.name}-${worker.number}][${getTime()}][POST][FROM ${ctx.from.name}-${ctx.from.number}]`, msg)
        ctx.answer('Answer from the second to the "test post to second" event')
    })

    worker.on('test send to second', (msg, ctx) => {
        console.log(`[${worker.name}-${worker.number}][${getTime()}][SEND][from ${ctx.from.name}-${ctx.from.number}]`, msg)
    })

    worker.on('init', async () => {

        worker.to('master').send('test send to master', 'Message from the second to master')
    
        const answer = await worker.to('first', 1).post('test post to first', '"post" message from the first number 1.')
            .catch(e => e)
    
        console.log(`[${worker.name}-${worker.number}][${getTime()}][ANSWER]`, answer)
    })

    worker.on('err', () => { throw new Error('Test error') })

    worker.on('terminate', async (ctx) => {
        worker.to('master').send('test send to master', "I'm dying")
        ctx.end('Goodbye')
    })
}


main()