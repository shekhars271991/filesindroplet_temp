
const multer = require("multer");

const csvFilter = (req, file, cb) => {
    cb(null, true);
    /*if (file.mimetype.startsWith("image")) {
        cb(null, true);
    } else {
        cb("Please upload only images.", false);
    }*/
};

var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, __basedir + "/assets/uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}--${file.originalname}`);
    },
});

var fileHandler = multer({ storage: storage, fileFilter: csvFilter });
module.exports = fileHandler;