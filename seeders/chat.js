import mongoose from "mongoose"
import { Chat } from "../models/chat.js"
import { faker } from "@faker-js/faker"

export const sampleChats = async (number) => {
    try {
        const sampleChatsPromise = []
        for (let i = 0; i < number; i++) {
            sampleChatsPromise.push(Chat.create({
                name: faker.animal.type(),
                groupChat: faker.datatype.boolean(),
                creator: new mongoose.Types.ObjectId(),
                members: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => new mongoose.Types.ObjectId())
            }))
        }

        await Promise.all(sampleChatsPromise)

        console.log(`${number} sample chat created`)
        process.exit(1)
    } catch (err) {
        console.log("Error during generating fake data")
        process.exit(1)
    }


}