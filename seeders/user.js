import { User } from "../models/user.js"
import { faker } from "@faker-js/faker"

export const CreateFakeUsers = async (number) => {
    try {
        const userPromice = []
        for (let i = 0; i < number; i++) {
            userPromice.push(User.create({
                name: faker.person.fullName(),
                username: faker.internet.userName(),
                password: "2",
                bio: faker.lorem.sentences(2),
                avatar: {
                    url: faker.image.avatar(),
                    public_id: faker.string.uuid()
                }
            }))
        }

        await Promise.all(userPromice)
        console.log(number, "Users Created")
        process.exit(1)

    } catch (err) {
        console.log(err)
        process.exit(1)
    }



}