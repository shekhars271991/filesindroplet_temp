const db = require("../config/db");


const getBCTxns = async (req, res) => {
	
    const userId = req.user.user_id;
    const bc_txns = await db.query("SELECT ut.id user_txn_id, \
    bt.bc_txn_id bc_txn_id, action_timestamp \
    timestamp, block_number,txn_hash, up.user_name user_name, \
    bc_status blockchain_status, tt.name txn_type FROM \
    dgmsdb.blockchain_txns bt \
    inner join dgmsdb.user_txns ut \
    inner join user_profiles up \
    inner join txn_types_pl tt \
    where  \
    bt.ref_id = ut.id and \
    up.id = ut.user_id and \
    ut.txn_type = tt.id \
    and ut.user_id = '" + userId + "'");

    res.send(bc_txns);
}

const createBCTxn = async (req, res) => {
    //res.send({ status: req.body.formdata})
    let usertxn =  db.query("SELECT id FROM user_txns WHERE id = " + req.body.formdata.user_txn_id)

    if (usertxn.length == 0) {
        res.send({
            "status": "Failed",
            "msg": "No such user txn found"
        })
    }
    else {
        try {
            const data = {
                'ref_id': req.body.formdata.user_txn_id,
                'txn_hash': req.body.formdata.txn_hash,
                'bc_status': 'Pending',
                'block_number': req.body.formdata.block_number,
                'txn_metadata': req.body.formdata.txn_metadata
            };

             db.query("INSERT INTO blockchain_txns SET ?", data);
			res.send({ status: "ok" });
        }
        catch {
            res.send({
                "status": "Failed"
            })
        }
    }

    res.send({ status: "ok" });
}

const updateStatus = async (req, res) => {
	try{
	result1 = await db.query("UPDATE blockchain_txns SET bc_status = 'Commited' WHERE txn_hash = '"+ req.body.formdata.txn_hash+"'");
    res.send({ status: "ok" }); 
	}
	catch {
		 res.send({
                "status": "Failed"
            })
	}
    
	
};

module.exports = {
    getBCTxns: getBCTxns,
    createBCTxn: createBCTxn,
	updateStatus: updateStatus,
};