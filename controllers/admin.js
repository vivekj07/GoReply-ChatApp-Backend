import { ErrorHandler } from "../middlewares/error.js";
import { Chat } from "../models/chat.js"
import { Message } from "../models/message.js"
import { User } from "../models/user.js"
import jwt from "jsonwebtoken"

const adminLogin = async (req, res, next) => {
    try {
        const { secretKey } = req.body;
        if (!secretKey) return next(new ErrorHandler("Please enter Secret Key", 400))

        if (secretKey != process.env.ADMIN_SECRET_KEY)
            return next(new ErrorHandler("Incorrect Secret Key", 400))

        const token = jwt.sign({ secretKey }, process.env.JWT_SECRET)
        const cookieOptions = {
            maxAge: 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure: true,
            sameSite: 'none',

        }
        return res.status(200)
            .cookie("chatApp-admin-secretKey", token, cookieOptions)
            .json({
                success: true,
                message: "Logged in Successfully"
            })
    } catch (err) {
        next(err)
    }


}

const adminLogout = async (req, res, next) => {
    try {

        const cookieOptions = {
            maxAge: 0,
            httpOnly: true,
            secure: true,
            sameSite: 'none',

        }
        return res.status(200)
            .cookie("chatApp-admin-secretKey", "", cookieOptions)
            .json({
                success: true,
                message: "Logged out Successfully"
            })
    } catch (err) {
        next(err)
    }


}
const getIsAdmin = (req, res, next) => {
    return res.status(200).json({
        success: true,
        isAdmin: true
    })
}

const getAllUsers = async (req, res, next) => {
    try {
        const allUsers = await User.find()

        const usersPromise = allUsers.map(async ({ _id, name, avatar, username, }) => {

            const [groups, friends] = await Promise.all([
                Chat.countDocuments({ groupChat: true, members: _id }),
                Chat.countDocuments({ groupChat: false, members: _id }),
            ])
            return {
                _id,
                name,
                username,
                avatar: avatar.url,
                groups,
                friends
            }
        })

        const users = await Promise.all(usersPromise)

        return res.status(200).json({
            success: true,
            users
        })
    } catch (err) {
        next(err)
    }


}

const getAllChats = async (req, res, next) => {
    try {
        const allChats = await Chat.find()
            .populate("members", "name avatar")
            .populate("creator", "name avatar")

        const chatsPromise = allChats.map(async ({ _id, name, groupChat, members, creator }) => {

            const totalMessages = await Message.countDocuments({ chat: _id })

            return {
                _id,
                name,
                groupChat,
                avatar: members.map((i) => i.avatar.url),
                creator: {
                    name: creator?.name,
                    avatar: creator?.avatar.url
                },
                members: members.map(({ _id, name, avatar }) => ({
                    _id,
                    name,
                    avatar: avatar.url
                })),
                totalMembers: members.length,
                totalMessages


            }
        })

        const chats = await Promise.all(chatsPromise)

        return res.status(200).json({
            success: true,
            chats
        })
    } catch (err) {
        next(err)
    }


}

const getAllMessages = async (req, res, next) => {
    try {
        const allMessages = await Message.find()
            .populate("sender", "name avatar")
            .populate("chat", "groupChat")

        const Messages = allMessages.map(({ _id, content, attachments, sender, chat, createdAt }) => {

            return {
                _id,
                content,
                attachments,
                sender: {
                    name: sender.name,
                    avatar: sender.avatar.url
                },
                chat: chat._id,
                groupChat: chat.groupChat,
                createdAt

            }
        })

        return res.status(200).json({
            success: true,
            Messages
        })
    } catch (err) {
        next(err)
    }


}

const getDashboardStats = async (req, res, next) => {
    try {
        let stats = {}
        const today = new Date()
        let SevenDaysBefore = new Date()

        SevenDaysBefore.setDate(today.getDate() - 7)
        const [
            userCount,
            groupCount,
            messageCount,
            singleChats,
            lastSevenDaysMessages
        ] = await Promise.all(
            [
                User.countDocuments(),
                Chat.countDocuments({ groupChat: true }),
                Message.countDocuments(),
                Chat.countDocuments({ groupChat: false }),
                Message.find()

            ])

        const messageArray = new Array(7).fill(0);

        lastSevenDaysMessages.forEach((message) => {
            const daysDifference = Math.floor((today - message.createdAt) / (24 * 60 * 60 * 1000))
            if (daysDifference < 7) {
                messageArray[6 - daysDifference] += 1
            }

        })

        const compareChats = {
            singleChats,
            groupChats: groupCount
        }

        const counts = {
            user: userCount,
            groups: groupCount,
            messages: messageCount
        }

        stats = {
            messageArray,
            counts,
            compareChats,
        }
        return res.status(200).json({
            success: true,
            stats
        })
    } catch (err) {
        next(err)
    }
}




export { getAllUsers, getAllChats, getAllMessages, getDashboardStats, adminLogin, adminLogout, getIsAdmin }