import mongoose from "mongoose"
import { io, userSocketIDs } from "../app.js"
import { v2 as cloudinary } from "cloudinary"
import { v4 } from "uuid"

const ConnectDB = (uri) => {

    mongoose.connect(uri).then(() => {
        console.log("Database connected successfully")
    }).catch((err) => {
        console.log(err)
        throw err
    }
    )
}

const emitEvent = (req, event, users, data) => {
    console.log("emiting event", event)

    const usersSocket = getSockets(users)
    // const io = req.app.get("io")
    io.to(usersSocket).emit(event, data)

    // console.log("users", users)
    // console.log("ids", usersSocket)

}

const delefilesFromCloudinary = () => {

}


const getSockets = (users = []) => {
    const sockets = users.map((user) => userSocketIDs.get(user.toString()))
    return sockets
}

export const getBase64 = (file) =>
    `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

const uploadFlilesToCloudinary = async (files = []) => {
    const UploadPromise = files.map((file) => {
        return new Promise((resolve, reject) => {
            cloudinary.uploader.upload(
                getBase64(file),
                {
                    public_id: v4(),
                    resource_type: "auto"
                },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result)
                }
            )
        })
    })

    try {

        const results = await Promise.all(UploadPromise)

        const formatedResults = results.map(({ public_id, secure_url }) => ({
            public_id,
            url: secure_url

        }))

        return formatedResults

    } catch (err) {
        throw new Error("Error in uploading files on cloudinary")
    }

}

export { ConnectDB, emitEvent, delefilesFromCloudinary, getSockets, uploadFlilesToCloudinary }

