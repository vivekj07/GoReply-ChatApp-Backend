import mongoose, { Types } from "mongoose"

const schema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    groupChat: {
        type: Boolean,
        default: false,
    },

    members: [
        {
            type: Types.ObjectId,
            ref: "User"
        }
    ],
    creator: {
        type: Types.ObjectId,
        ref: "User"
    },

},
    {
        timestamps: true
    }
)

export const Chat = mongoose.model("Chat", schema)