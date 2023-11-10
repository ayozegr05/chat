import express from 'express'
import logger from 'morgan'
// import mysql from 'mysql2/promise'
import { Server } from 'socket.io'
import { createServer } from 'node:http'
import dotenv from 'dotenv'
import { createClient } from '@libsql/client'

dotenv.config()
const port = process.env.PORT ?? 3000

const app = express()
const server = createServer(app)
//io = in out entrada y salida. bidireccional.
const io = new Server(server, {       
    connectionStateRecovery: {}
})

const db = createClient({
    url: 'libsql://notable-archangel-ayozegr05.turso.io',
    authToken: process.env.DB_TOKEN
})

// const db = await mysql.createPool({
//     host: 'monorail.proxy.rlwy.net',
//     port: 3306,
//     user: 'root',
//     password: 'Ga1-11gaE13CDAegG551AcA-bHEeA4Ff',
//     database: 'railway'
// })

await db.execute('CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT)')

io.on('connection', async (socket) => {
    console.log('An user has connected!')

    socket.on('disconnect', () => {
        console.log('An user has disconnected!')
    })

    socket.on('chat message', async (msg) => {
        let result 
        try {
            result = await db.execute({
                sql: `INSERT INTO messages (content) VALUES (:msg)`,
                args: { msg }
            })
        } catch (e) {
            console.error(e)
            return
        }
        console.log('message:', msg)
        io.emit('chat message', msg, result.lastInsertRowid.toString() )
    })

    console.log('auth ')
    console.log(socket.handshake.auth)

    if (!socket.recovered) { 
        try{
            const results = await db.execute({
                sql: 'SELECT id, content FROM messages WHERE id >?',
                args: [socket.handshake.auth.serverOffset ?? 0]
            })
            results.rows.forEach(row => {
                socket.emit('chat message', row.content, row.id.toString())
            })
        } catch (e) {
            console.error(e)
            return
        }
    }
})

app.use(logger('dev'))

app.get('/', (req, res) => {
    res.sendFile(process.cwd() + '/client/index.html')
})

server.listen(port, () => {
    console.log(`Server running on port ${port}`)
})