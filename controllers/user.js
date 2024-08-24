import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { ErrorHandler } from "../middlewares/error.js"
import { Chat } from "../models/chat.js"
import { Request } from "../models/request.js"
import { User } from "../models/user.js"
import { emitEvent, uploadFlilesToCloudinary } from "../utils/features.js"
import { ALERT, NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js"

const newUser = async (req, res, next) => {
    try {
        const { name, username, password, bio } = req.body
        const file = req.file
        if (!file) return next(new ErrorHandler("Please add Avatar", 400))
        if (!name || !username || !password || !bio) return next(new ErrorHandler("Please Enter all fields", 400))

        const results = await uploadFlilesToCloudinary([file])


        const avatar = {
            public_id: results[0].public_id,
            url: results[0].url
        }

        const user = await User.create({
            name,
            username,
            password,
            bio,
            avatar

        })

        const cookieOptions = {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 24 * 60 * 60 * 1000
        }
        const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET)
        return res.status(201).cookie("chatApp-user-token", token, cookieOptions).json({
            success: true,
            message: "User created Successfully",
            user
        })
    } catch (err) {
        if (err.code === 11000) {
            err.message = "Username already exist"
        }
        next(err)
    }
}

const login = async (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return next(new ErrorHandler("Please Enter all fields", 400))

        const user = await User.findOne({ username }).select("+password")
        if (!user) return next(new ErrorHandler("Invalid Username", 400))
        const checkedPassword = await bcrypt.compare(password, user.password)
        if (!checkedPassword) return next(new ErrorHandler("Invalid Password", 400))

        const cookieOptions = {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 24 * 60 * 60 * 1000
        }
        const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET)
        return res.status(200).cookie("chatApp-user-token", token, cookieOptions).json({
            success: true,
            message: `Welcome back ${user.name}`,
            user
        })
    } catch (err) {
        next(err)
    }
}

const getMyProfile = async (req, res, next) => {
    try {

        const user = await User.findById(req.userId)

        if (!user) return next(new ErrorHandler("Please Relogin and try again"))

        return res.status(200).json({
            success: true,
            user
        })
    } catch (err) {
        next(err)
    }
}

const logout = async (req, res, next) => {
    try {

        const user = await User.findById(req.userId)

        if (!user) return next(new ErrorHandler("Login First"))
        const cookieOptions = {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 0
        }
        return res.status(200).cookie("chatApp-user-token", "", cookieOptions).json({
            success: true,
            message: `Logged out successfully `
        })
    } catch (err) {
        next(err)
    }
}

const searchNewFriends = async (req, res, next) => {
    try {

        const { name } = req.query

        const myChats = await Chat.find({ groupChat: false, members: req.userId })
        const Myfriends = myChats.map((myChat) => myChat.members).flat()

        const allUsersExeptMeAndFriends = await User.find({
            _id: { $nin: Myfriends },
            name: { $regex: name, $options: "i" }
        })

        const users = allUsersExeptMeAndFriends.map((i) => ({
            _id: i._id,
            name: i.name,
            avatar: i.avatar.url
        }))

        return res.status(200).json({
            success: true,
            users
        })
    } catch (err) {
        next(err)
    }
}

const sendFriendRequest = async (req, res, next) => {
    try {

        const { id } = req.body
        console.log(id)
        if (!id) return next(new ErrorHandler("Please enter friends ID to send request", 400))

        const request = await Request.findOne({
            $or: [
                { sender: req.userId, reciever: id },
                { sender: id, reciever: req.userId },
            ]
        })
        if (request) return next(new ErrorHandler("Request already sent", 400))

        await Request.create({
            sender: req.userId,
            reciever: id
        })

        emitEvent(req, NEW_REQUEST, [id])

        return res.status(200).json({
            success: true,
            message: "Sent Request"
        })
    } catch (err) {
        next(err)
    }
}

const handleRequest = async (req, res, next) => {
    try {

        const { requestId, accept } = req.body
        if (!requestId) return next(new ErrorHandler("Please provide ID", 400))
        if (accept == null) return next(new ErrorHandler("Please accept or reject Request", 400))

        const request = await Request.findById(requestId)
            .populate("sender", "name")
            .populate("reciever", "name")

        if (!request) return next(new ErrorHandler("Request not found", 400))

        if (request.reciever._id.toString() != req.userId.toString())
            return next(new ErrorHandler("Request not athorized to you", 400))

        if (accept) {

            await Promise.all([
                Chat.create({
                    name: `${request.sender.name}-${request.reciever.name}`,
                    members: [request.sender._id, request.reciever._id]
                }),
                request.deleteOne()
            ])

            emitEvent(req, REFETCH_CHATS, [request.sender._id, request.reciever._id])

            return res.status(200).json({
                success: true,
                message: "Request Accepted",
                sendeId: request.sender._id
            })

        }

        await request.deleteOne()

        return res.status(200).json({
            success: true,
            message: "Request Rejected"
        })



    } catch (err) {
        next(err)
    }
}

const getNotifications = async (req, res, next) => {
    try {

        const requests = await Request.find({ reciever: req.userId })
            .populate("sender", "name avatar")


        if (requests.length == 0) {
            return res.status(200).json({
                success: true,
                requests: []
            })
        };
        const TransformedRequests = requests.map(({ _id, sender }) => ({
            _id,
            sender: {
                _id: sender._id,
                name: sender.name,
                avatar: sender.avatar.url
            }
        }))


        return res.status(200).json({
            success: true,
            requests: TransformedRequests
        })



    } catch (err) {
        next(err)
    }
}

const getMyFriends = async (req, res, next) => {
    try {
        const { chatId } = req.query

        const chats = await Chat.find({ members: req.userId, groupChat: false })
            .populate("members", "name avatar")

        if (chats.length == 0) return next(new ErrorHandler("No friends Yet", 400))


        const meAndMyfriends = chats.flatMap(({ members }) => members)
        const friends = meAndMyfriends.filter((i) => i._id.toString() != req.userId.toString())
            .map(({ name, _id, avatar }) => ({
                _id,
                name,
                avatar: avatar.url
            }))


        if (chatId) {
            const chat = await Chat.findById(chatId)
            if (!chat) return next(new ErrorHandler("Chat not found", 400))

            const availableFriends = friends.filter((i) => !chat.members.includes(i._id))
            return res.status(200).json({
                success: true,
                availableFriends
            })
        } else {
            return res.status(200).json({
                success: true,
                friends
            })
        }






    } catch (err) {
        next(err)
    }
}




export {
    getMyProfile, login, logout, newUser, searchNewFriends, sendFriendRequest, handleRequest,
    getNotifications, getMyFriends
}
