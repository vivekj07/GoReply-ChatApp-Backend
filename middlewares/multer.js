import multer from "multer"

const upload = multer({
    limits: {
        fileSize: 1024 * 1024 * 5
    }
})

const singleAvatar = upload.single("avatar")
const attachmentsMulter = upload.array("files", 10)

export { singleAvatar, attachmentsMulter }