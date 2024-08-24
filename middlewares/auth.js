import jwt from "jsonwebtoken"
import { ErrorHandler } from "./error.js"
import { User } from "../models/user.js"

export const isAuthenticated = (req, re, next) => {
    const token = req.cookies[`chatApp-user-token`]

    if (!token) return next(new ErrorHandler("Please Login first", 400))

    const data = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = data._id
    next()
}

export const adminOnly = (req, re, next) => {
    const token = req.cookies[`chatApp-admin-secretKey`]
    if (!token) return next(new ErrorHandler("Only Admin can access this page", 400))

    const data = jwt.verify(token, process.env.JWT_SECRET)
    if (data.secretKey != process.env.ADMIN_SECRET_KEY)
        return next(new ErrorHandler("Invalid Token", 400))

    next()
}

export const socketAuthentication = async (err, socket, next) => {

    try {
        if (err) return next(err);

        const token = socket.request.cookies[`chatApp-user-token`]
        if (!token) return next(new ErrorHandler("Please Login first", 400))

        const data = jwt.verify(token, process.env.JWT_SECRET)

        const user = await User.findById(data._id)

        if (!user) return next(new ErrorHandler("Please Login first", 400))

        socket.user = user;
        return next()
    } catch (err) {
        console.log(err)
        return next(err)
    }


}