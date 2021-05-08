const {thread} = require('../index')
const {getTime} = require('./helper')


async function main() {

    await thread.init()

    console.log('INITED', getTime(), thread.name, thread.number)

    thread.on('test post to first', (msg, ctx) => {
        console.log(`[${thread.name}-${thread.number}][${getTime()}][POST][FROM ${ctx.from.name}-${ctx.from.number}]`, msg)
        ctx.answer(`Answer from the first number ${thread.number}`)
    })

    thread.on('test send to first', (msg, ctx) => {
        console.log(`[${thread.name}-${thread.number}][${getTime()}][SEND][FROM ${ctx.from.name}-${ctx.from.number}]`, msg)
    })

    thread.on('terminate', async (ctx) => {
        await thread.to('main').send('test send to main', "I'm dying")
        ctx.end('Goodbye')
    })

    thread.to('second').send('test send to second', 'Message from the first to the second')
}


main()