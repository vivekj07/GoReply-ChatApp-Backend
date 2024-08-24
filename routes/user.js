import express from "express"
import { getMyFriends, getMyProfile, getNotifications, handleRequest, login, logout, newUser, searchNewFriends, sendFriendRequest } from "../controllers/user.js"
import { singleAvatar } from "../middlewares/multer.js"
import { isAuthenticated } from "../middlewares/auth.js"

const app = express.Router()

app.post("/create", singleAvatar, newUser)
app.post("/login", login)

// Authenticated Users Only
app.use(isAuthenticated)
app.get("/profile", getMyProfile)
app.get("/search", searchNewFriends)

app.post("/logout", logout)
app.put("/sendrequest", sendFriendRequest)
app.put("/handlerequest", handleRequest)
app.get("/notifications", getNotifications)
app.get("/friends", getMyFriends)







export default app