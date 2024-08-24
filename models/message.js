import mongoose, { Types } from "mongoose"

const schema = new mongoose.Schema({
    content: {
        type: String,
    },
    attachments: [{
        public_id: {
            type: String,
            required: true,
        },
        url: {
            type: String,
            required: true,
        },
    }

    ],
    sender: {
        type: Types.ObjectId,
        required: true,
        ref: "User"
    },
    chat: {
        type: Types.ObjectId,
        ref: 'Chat',
        required: true,

    }
},
    {
        timestamps: true
    }
)

export const Message = mongoose.model("Message", schema)