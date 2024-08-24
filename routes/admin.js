import express from "express"
import { adminLogin, adminLogout, getAllChats, getAllMessages, getAllUsers, getDashboardStats, getIsAdmin } from "../controllers/admin.js"
import { adminOnly } from "../middlewares/auth.js"

const app = express.Router()


app.post("/login", adminLogin)
app.post("/logout", adminLogout)

app.use(adminOnly)

app.get("/isAdmin", getIsAdmin)
app.get("/users", getAllUsers)
app.get("/chats", getAllChats)
app.get("/messages", getAllMessages)
app.get("/dashboard", getDashboardStats)

export default app