const multer = require('multer');
const path = require('path');
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname,"..", "Public/img")),
    filename: (req, file, cb) => cb(null, `${Date.now()}${file.originalname}`)
});

const upload = multer({
    storage,
    // limits: { fileSize: 50 * 1024 * 1024 },
});

module.exports = {upload};