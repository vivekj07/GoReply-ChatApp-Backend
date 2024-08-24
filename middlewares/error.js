import { envMode } from "../app.js"

export const errorMiddleware = (err, req, res, next) => {

    err.message = err.message || "Internal Server Error"
    err.statusCode = err.statusCode || 500
    // console.log(err)
    if (err.name == "ValidationError") {
        return res.status(err.statusCode).json({
            success: false,
            message: "Invalid ID"
        })
    }

    if (err.name == "CastError") {
        err.message = "Invalid field"
    }

    const errorObj = {
        success: false,
        message: err.message
    }

    if (envMode === "DEVELOPEMENT") {
        errorObj.error = err
    }

    return res.status(err.statusCode).json(errorObj)
}

class ErrorHandler extends Error {
    constructor(message, statusCode) {
        super(message)
        this.statusCode = statusCode
    }
}

export { ErrorHandler }