import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express from "express";
import { Server } from "socket.io"
import { createServer } from "http"
import { v4 as uuid } from "uuid"
import cors from "cors"
import { v2 as cloudinary } from "cloudinary"

import { errorMiddleware } from "./middlewares/error.js";
import adminRoute from "./routes/admin.js";
import chatRoute from "./routes/chat.js";
import userRoute from "./routes/user.js";
import { ConnectDB, getSockets } from "./utils/features.js";
import { CHAT_JOINED, CHAT_LEFT, NEW_MESSAGE, NEW_MESSAGE_ALERT, ONLINE_USERS, START_TYPING, STOP_TYPING } from "./constants/events.js";
import { Message } from "./models/message.js";
import { socketAuthentication } from "./middlewares/auth.js";

dotenv.config({
    path: "./.env",
});
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})



const port = process.env.PORT || 4000;
const mongo_uri = process.env.mongo_uri
export const envMode = process.env.NODE_ENV || "PRODUCTION"
export const userSocketIDs = new Map()
export const onlineUsers = new Set()

const app = express()
const server = createServer(app)
export const io = new Server(server, {
    cors: {
        origin: ['http://localhost:5173', 'http://localhost:4173', process.env.CLIENT_URL],
        credentials: true
    }
})
// app.set("io", io)

ConnectDB(mongo_uri)

app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:4173', process.env.CLIENT_URL],
    credentials: true
}))

app.use("/api/v1/user", userRoute)
app.use("/api/v1/chat", chatRoute)
app.use("/api/v1/admin", adminRoute)

io.use((socket, next) => {
    cookieParser()(socket.request,
        socket.request.res,
        async (err) => {
            await socketAuthentication(err, socket, next)
        }
    )
})

io.on("connection", (socket) => {
    // console.log("user conected", socket.id)
    const user = socket.user

    userSocketIDs.set(user._id.toString(), socket.id)

    socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
        const messageForRealTime = {
            content: message,
            sender: {
                _id: user._id,
                name: user.name
            },
            _id: uuid(),
            chat: chatId,
            createdAt: new Date().toISOString()
        }

        const messageForDB = {
            content: message,
            sender: user._id,
            chat: chatId,
        }

        const userSockets = getSockets(members)

        // console.log(members)
        // console.log(userSockets)

        io.to(userSockets).emit(NEW_MESSAGE, {
            chatId,
            message: messageForRealTime
        })

        io.to(userSockets).emit(NEW_MESSAGE_ALERT, { chatId })

        try {
            await Message.create(messageForDB)
        } catch (err) {
            throw new Error(err)
        }

    })

    socket.on(START_TYPING, ({ chatId, members, name }) => {
        const membersSockets = getSockets(members)
        // console.log(`${name} is typing to`, membersSockets)

        io.to(membersSockets).emit(START_TYPING, { chatId, name })
    })

    socket.on(STOP_TYPING, ({ chatId, members, name }) => {
        const membersSockets = getSockets(members)
        // console.log(`${name} stopped typing to`, membersSockets)

        io.to(membersSockets).emit(STOP_TYPING, { chatId, name })
    })

    socket.on(CHAT_JOINED, ({ userId, members }) => {
        const membersSockets = getSockets(members)
        onlineUsers.add(userId.toString())

        io.to(membersSockets).emit(ONLINE_USERS, Array.from(onlineUsers))
    })

    socket.on(CHAT_LEFT, ({ userId, members }) => {
        const membersSockets = getSockets(members)
        onlineUsers.delete(userId.toString())

        io.to(membersSockets).emit(ONLINE_USERS, Array.from(onlineUsers))
    })

    socket.on("disconnect", () => {
        userSocketIDs.delete(user._id.toString())
        onlineUsers.delete(user._id.toString())

        socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers))

        // console.log("user disconnected", socket.id)
    })
})




app.use(errorMiddleware)
server.listen(port, () => {
    console.log(`Server is listenning on port ${port}`)
})