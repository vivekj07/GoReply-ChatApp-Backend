import { v4 } from "uuid"
import { ALERT, NEW_MESSAGE, NEW_MESSAGE_ALERT, REFETCH_CHATS } from "../constants/events.js"
import { ErrorHandler } from "../middlewares/error.js"
import { Chat } from "../models/chat.js"
import { Message } from "../models/message.js"
import { User } from "../models/user.js"
import { delefilesFromCloudinary, emitEvent, uploadFlilesToCloudinary } from "../utils/features.js"

const newGroupChat = async (req, res, next) => {
    try {
        const { name, members } = req.body
        console.log(name, members)

        if (!name || !members) return next(new ErrorHandler("Please enter all fields", 400))

        const allmembers = [...members, req.userId]

        const newGroup = await Chat.create({
            name,
            members: allmembers,
            creator: req.userId,
            groupChat: true
        })

        emitEvent(req, ALERT, allmembers, { message: `Welcome to ${name} Group.`, chatId: newGroup._id })
        emitEvent(req, REFETCH_CHATS, members)

        return res.status(201).json({
            success: true,
            message: "New Group Created"
        })
    } catch (err) {
        next(err)
    }

}

const getMyChats = async (req, res, next) => {
    try {


        const myChats = await Chat.find({ members: req.userId }).populate("members", "name avatar")

        const transformedChats = myChats.map(({ _id, name, groupChat, members }) => {
            const otherMember = members.filter((member) => member._id != req.userId)[0]
            return {
                _id,
                groupChat,
                name: groupChat ? name : otherMember?.name || "You",
                members: members.filter((member) => member._id != req.userId).map((i) => i._id),
                avatar: groupChat ? members.map((i) => i.avatar.url) : [otherMember?.avatar?.url]
            }
        })


        return res.status(201).json({
            success: true,
            transformedChats
        })
    } catch (err) {
        next(err)
    }

}

const getMyGroups = async (req, res, next) => {
    try {
        const mygroups = await Chat.find({
            members: req.userId,
            groupChat: true,
            creator: req.userId
        }).populate("members", "name avatar")

        const transformedGroups = mygroups.map(({ _id, name, groupChat, members }) => {
            return {
                _id,
                name,
                groupChat,
                members: members.map((i) => (
                    {
                        _id: i._id,
                        name: i.name,
                        avatar: i.avatar.url
                    }
                )),
                avatar: members.map((i) => i.avatar.url)
            }
        })


        return res.status(201).json({
            success: true,
            transformedGroups
        })
    } catch (err) {
        next(err)
    }

}

const addMembers = async (req, res, next) => {
    try {
        const { members, groupId } = req.body
        if (!groupId) return next(new ErrorHandler("Please give group ID to add members", 400));
        let group = await Chat.findById(groupId)

        if (members.length < 1) return next(new ErrorHandler("Please Select alleast one Member to add", 400));
        if (!group) return next(new ErrorHandler("Group not found", 400))
        if (!group.groupChat) return next(new ErrorHandler("This is not a group", 400));

        if (group.creator.toString() != req.userId.toString())
            return next(new ErrorHandler("You are not admin", 400));

        const uniqeMembers = members.filter((member) => !group.members.includes(member))

        if (uniqeMembers.length == 0) return next(new ErrorHandler("Members already Exist", 400))

        group.members = [...group.members, ...uniqeMembers]

        await group.save()

        const uniqeMembersPromise = uniqeMembers.map((i) => User.findById(i).select("name"))

        const uniqeUsers = await Promise.all(uniqeMembersPromise)
        const uniqeUsersNames = uniqeUsers.map((i) => i.name).join(",")

        emitEvent(req, ALERT, group.members, { message: `${uniqeUsersNames} added in the group`, chatId: groupId })
        emitEvent(req, REFETCH_CHATS, group.members)

        return res.status(201).json({
            success: true,
            message: `${uniqeUsersNames} added in the group`,

        })
    } catch (err) {
        next(err)
    }

}

const removeMembers = async (req, res, next) => {
    try {
        const { member, groupId } = req.body;
        if (!groupId) return next(new ErrorHandler("Please give group ID to remove member", 400));
        if (!member) return next(new ErrorHandler("Please give member to remove", 400));

        const [group, user] = await Promise.all([
            Chat.findById(groupId),
            User.findById(member).select("name")
        ])

        if (!user) return next(new ErrorHandler("User not found", 400))
        if (!group) return next(new ErrorHandler("Group not found", 400))
        if (!group.groupChat) return next(new ErrorHandler("This is not a group", 400));

        if (group.creator.toString() != req.userId.toString())
            return next(new ErrorHandler("You are not admin", 400));

        const allChatMembers = group.members.map((i) => i.toString())
        group.members = group.members.filter((user) => user.toString() != member.toString())

        if (group.creator == member && group.members.length >= 1) {
            group.creator = group.members[0]
        }

        if (group.members.length < 1) {
            await Promise.all([
                Message.deleteMany({ chat: groupId }),
                group.deleteOne()
            ])
        } else {
            await group.save()

        }

        emitEvent(req, ALERT, group?.members, { message: `${user.name} removed from the group`, chatId: groupId })
        emitEvent(req, REFETCH_CHATS, allChatMembers)
        return res.status(201).json({
            success: true,
            message: `${user.name} removed from the group`,

        })
    } catch (err) {
        next(err)
    }

}

const leaveGroup = async (req, res, next) => {
    try {
        const member = req.userId;
        const { groupId } = req.params;
        if (!groupId) return next(new ErrorHandler("Please give valid group ID", 400));

        const [group, user] = await Promise.all([
            Chat.findById(groupId),
            User.findById(member).select("name")
        ])

        if (!user) return next(new ErrorHandler("User not found", 400))
        if (!group) return next(new ErrorHandler("Group not found", 400))
        if (!group.groupChat) return next(new ErrorHandler("This is not a group", 400));

        group.members = group.members.filter((i) => i.toString() != member.toString())

        if (group.creator == member && group.members.length >= 1) {
            group.creator = group.members[0]
        }

        if (group.members.length < 1) {
            await Promise.all([
                Message.deleteMany({ chat: groupId }),
                group.deleteOne()
            ])

        } else {
            await group.save()
        }
        emitEvent(req, ALERT, group?.members, { message: `${user.name} leave the group`, chatId: groupId })
        emitEvent(req, REFETCH_CHATS, group?.members)
        return res.status(201).json({
            success: true,
            message: `${user.name} leave the group`,

        })
    } catch (err) {
        next(err)
    }

}

const sendAttachments = async (req, res, next) => {
    try {
        const { chatId } = req.body
        if (!chatId) return next(new ErrorHandler("Please Provide chatId", 400))
        const files = req.files || [];

        if (files.length < 1) return next(new ErrorHandler("Please upload files", 400))
        if (files.length > 10) return next(new ErrorHandler("Max file limit is 10", 400))

        const [chat, user] = await Promise.all([
            Chat.findById(chatId),
            User.findById(req.userId).select("name")
        ])

        if (!chat) return next(new ErrorHandler("Chat not found", 400))

        // Fille Uploading

        const attachments = await uploadFlilesToCloudinary(files)

        const message = await Message.create({
            content: "",
            attachments,
            sender: req.userId,
            chat: chatId
        })

        const realTimeMessage = {
            content: "",
            attachments,
            sender: {
                _id: user._id,
                name: user.name
            },
            _id: v4(),
            chat: chatId
        }

        emitEvent(req, NEW_MESSAGE, chat.members, {
            message: realTimeMessage,
            chatId
        })

        emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId })


        return res.status(201).json({
            success: true,
            message
        })
    } catch (err) {
        next(err)
    }

}

const getChatDetails = async (req, res, next) => {
    try {
        const populate = req.query.populate;
        const chatId = req.params.id
        console.log("getting chatDetails from ", chatId)

        if (!chatId) return next(new ErrorHandler("Please Provide chatId", 400))

        if (populate) {
            const chat = await Chat.findById(chatId).populate("members", "name avatar").lean()
            if (!chat) return next(new ErrorHandler("Chat not found", 400))

            chat.members = chat.members.map(({ _id, name, avatar }) => ({
                _id, name,
                avatar: avatar.url
            }))

            return res.status(201).json({
                success: true,
                chat
            })
        }
        else {
            const chat = await Chat.findById(chatId)
            if (!chat) return next(new ErrorHandler("Chat not found", 400))

            return res.status(201).json({
                success: true,
                chat
            })
        }


    } catch (err) {
        // if (err.path == "_id" && err.value == "null") {
        //     return
        // }
        // else {
        //     next(err)
        // }
        next(err)
    }

}

const renameGroup = async (req, res, next) => {
    try {
        const chatId = req.params.id
        const { newName } = req.body
        if (!chatId) return next(new ErrorHandler("Please Provide chatId", 400))
        if (!newName) return next(new ErrorHandler("Please Provide name to Update", 400))

        const chat = await Chat.findById(chatId)
        if (!chat) return next(new ErrorHandler("Chat not found", 400))
        if (!chat.groupChat) return next(new ErrorHandler("This is not GroupChat", 400))
        if (chat.creator.toString() != req.userId.toString()) return next(new ErrorHandler("You are not admin", 400))

        chat.name = newName;
        chat.save()

        emitEvent(req, REFETCH_CHATS, chat.members)
        return res.status(201).json({
            success: true,
            message: `Group name changed to ${newName}`
        })


    } catch (err) {
        next(err)
    }

}

const deleteChat = async (req, res, next) => {
    try {
        const chatId = req.params.id
        if (!chatId) return next(new ErrorHandler("Please Provide chatId", 400))

        const chat = await Chat.findById(chatId)
        if (!chat) return next(new ErrorHandler("Chat not found", 400))
        if (chat.groupChat && chat.creator.toString() != req.userId.toString())
            return next(new ErrorHandler("You are not admin", 400))
        if (!chat.groupChat && !chat.members.includes(req.userId))
            return next(new ErrorHandler("You are not allowed to delete this Chat", 400))

        const messagesWithAttachments = await Message.find({
            chat: chatId,
            attachments: {
                $exists: true,
                $ne: []
            }
        })

        const allPublicIds = []

        messagesWithAttachments.forEach(({ attachments }) => {
            attachments.forEach((attachment) => {
                allPublicIds.push(attachment.public_id)
            })
        })

        await Promise.all([
            delefilesFromCloudinary,
            chat.deleteOne(),
            Message.deleteMany({ chat: chatId })
        ])

        emitEvent(req, REFETCH_CHATS, chat.members)

        return res.status(201).json({
            success: true,
            message: `Chat deleted Successfully`
        })


    } catch (err) {
        next(err)
    }

}

const getMessages = async (req, res, next) => {
    try {
        console.log("refetching")
        const chatId = req.params.id
        const page = req.query.page || 1;

        const limit = 20;
        const skip = (page - 1) * limit

        if (!chatId) return next(new ErrorHandler("Please Provide chatId", 400))

        const chat = await Chat.findById(chatId)
        if (!chat) return next(new ErrorHandler("Chat not found", 400))

        if (!chat.members.includes(req.userId))
            return next(new ErrorHandler("You cannot access this Chat", 400))

        const [messages, totalMessages] = await Promise.all([
            Message.find({ chat: chatId }).sort({ createdAt: -1 }).skip(skip).limit(limit)
                .populate("sender", "name"),
            Message.countDocuments({ chat: chatId })
        ])

        const totalPages = Math.ceil(totalMessages / limit)

        emitEvent(req, REFETCH_CHATS, chat.members)

        return res.status(201).json({
            success: true,
            messages: messages.reverse(),
            totalPages
        })


    } catch (err) {
        next(err)
    }

}

export { addMembers, deleteChat, getChatDetails, getMessages, getMyChats, getMyGroups, leaveGroup, newGroupChat, removeMembers, renameGroup, sendAttachments }

