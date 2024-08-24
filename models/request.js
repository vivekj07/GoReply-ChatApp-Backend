import mongoose, { Types } from "mongoose"

const schema = new mongoose.Schema({
    sender: {
        type: Types.ObjectId,
        required: true,
        ref: "User"
    },
    reciever: {
        type: Types.ObjectId,
        required: true,
        ref: "User"
    },
    status: {
        type: String,
        default: "Pending",
        enum: ["Pending", "Accepted", "Rejected"]
    },

},
    {
        timestamps: true
    }
)

export const Request = mongoose.model("Request", schema)