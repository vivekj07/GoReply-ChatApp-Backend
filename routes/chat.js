import express from "express"

import { isAuthenticated } from "../middlewares/auth.js"
import {
    addMembers, deleteChat, getChatDetails, getMessages, getMyChats, getMyGroups, leaveGroup,
    newGroupChat, removeMembers, renameGroup, sendAttachments
} from "../controllers/chat.js"
import { attachmentsMulter } from "../middlewares/multer.js"


const app = express.Router()
app.use(isAuthenticated)
app.post("/new", newGroupChat)
app.get("/mychats", getMyChats)
app.get("/mygroups", getMyGroups)
app.put("/addmembers", addMembers)
app.put("/removemember", removeMembers)
app.delete("/leave/:groupId", leaveGroup)

app.post("/message", attachmentsMulter, sendAttachments)
app.get("/message/:id", getMessages)
app.route("/:id").get(getChatDetails).put(renameGroup).delete(deleteChat)









export default app