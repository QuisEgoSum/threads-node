const {getTime} = require('./helper')
const {thread} = require('../index')


async function main() {

    await thread.init()

    console.log('INITED', getTime(), thread.name, thread.number)

    thread.on('test post to second', (msg, ctx) => {
        console.log(`[${thread.name}-${thread.number}][${getTime()}][POST][FROM ${ctx.from.name}-${ctx.from.number}]`, msg)
        ctx.answer('Answer from the second to the "test post to second" event')
    })

    thread.on('test send to second', (msg, ctx) => {
        console.log(`[${thread.name}-${thread.number}][${getTime()}][SEND][from ${ctx.from.name}-${ctx.from.number}]`, msg)
    })

    thread.to('main').send('test send to main', 'Message from the second to main')
    
    const answer = await thread.to('first', 1).post('test post to first', '"post" message from the first number 1.')
        .catch(e => e)

    console.log(`[${thread.name}-${thread.number}][${getTime()}][ANSWER]`, answer)

    thread.on('err', () => { throw new Error('Test error') })

    thread.on('terminate', async (ctx) => {
        thread.to('main').send('test send to main', "I'm dying")
        ctx.end('Goodbye')
    })
}


main()