const express = require("express");
const router = express.Router();
const upload = require("../helper/upload");

const capacityController = require('../controllers/capacity-controller');
const accountController = require('../controllers/account-controller');
let routes = (app) => {
    router.get("/capacity", capacityController.get);
    router.get("/login", accountController.get);

    router.post("/capacity", upload.single("capacity_file"), capacityController.createCapacity);

    return app.use("/", router);
};

module.exports = routes;