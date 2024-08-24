import mongoose from "mongoose"
import bcrypt from "bcrypt"

const schema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    bio: {
        type: String,
        required: true,
    },
    avatar: {
        url: {
            type: String,
            required: true,
        },
        public_id: {
            type: String,
            required: true,
        }
    }
},
    {
        timestamps: true
    }
)

schema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        console.log("not modified")
        return next()
    }
    this.password = await bcrypt.hash(this.password, 10)
})

export const User = mongoose.model("User", schema)