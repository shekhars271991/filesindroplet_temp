const db = require("../config/db");

const getBCTxns = async (req, res) => {
	
	res.send({ status: "ok" });
   
}

const createBCTxn = async (req, res) => {
   
    res.send({ status: "ok" })
}

module.exports = {
    getBCTxns: getBCTxns,
    createBCTxn: createBCTxn
};
