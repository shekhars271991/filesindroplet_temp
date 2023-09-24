const path = require("path");
const csv = require('csv-parser')
const fs = require('fs');
var XLSX = require('xlsx');
var mysql = require('mysql');

const TransactionType = require('../constants/transaction-types');
const db = require('../config/db');
const { contentSecurityPolicy } = require("helmet");

const get = async (req, res) => {
    if (req.user.org_type == "ISGS") {
        if (req.query.action_date == undefined || req.query.action_date == null || req.query.action_date == "")
            req.query.action_date = new Date().getFullYear() + "-" + (new Date().getMonth() + 1) + "-" + (new Date().getDate());
        var result = await db.query("select * from distribution_plans WHERE plan_date='" + req.query.action_date + "'");

        if (result.length == 0) {
            res.status(404);
            res.send({ status: '404', data: [], message: "isgs yet to upload capcity sheet." }); 
            return;
        }
        var plan_id = result[0].id;
        result = await db.query("SELECT id, txn_status, max(version) as version FROM user_txns WHERE plan_id=" + plan_id + " and user_id = " + req.user.user_id + " group by id, txn_status order by version desc");

        if (result.length == 0) {
            res.status(404);
            res.send({ status: '404', data: [], message: "isgs yet to upload capcity sheet." });
            return;
        }
        var latestVersion = result[0].version;

        var blocks = await db.query("SELECT dc.* FROM declared_capacity dc JOIN user_txns ut ON dc.txn_id = ut.id WHERE plan_id=" + plan_id + " and version = " + latestVersion);
        res.setHeader("Content-Type", "application/json");
        res.send({ status: result[0].txn_status, data: blocks, transaction_id: result[0].id });
        return;
    }
    else if (req.user.org_type == "RLDC") {
        if (req.query.action_date == undefined || req.query.action_date == null || req.query.action_date == "")
            req.query.action_date = new Date().getFullYear() + "-" + (new Date().getMonth() + 1) + "-" + (new Date().getDate());
        var plan = await db.query("select * from distribution_plans WHERE plan_date='" + req.query.action_date + "'");

        var response = {
            plan: {
                plan_id: plan[0].id,
                plan_stage: plan[0].plan_stage,
                plan_date: plan[0].plan_date
            },
            txn_details: {},
            capacity: {}
        };
        if (plan.length == 0) {
            res.status(404);
            res.send({ status: '404', data: [], message: "isgs yet to upload capcity sheet." });
            return;
        }
        var plan_id = plan[0].id;
        var transactions = await db.query("SELECT user_id, max(version) as version FROM user_txns WHERE plan_id=" + plan_id + " and txn_status = 2 group by user_id");

        if (transactions.length == 0) {
            res.status(404);
            res.send({ message: 'No published capacity found for the date.' });
            return;
        }
        for (var index = 0; index < transactions.length; index++) {
            var transaction = await db.query("SELECT action_timestamp as txn_date, txn_type, txn_source, version \
            FROM user_txns WHERE plan_id=" + plan_id + " and txn_status = 2 and user_id = " + transactions[index].user_id + " and version = " + transactions[index].version);
            var userAccount = await db.query(" \
            SELECT up.id, full_name, ur.name as role, ot.name as org_type, o.name as org_name FROM user_profiles up \
            JOIN user_roles_pl ur ON up.role = ur.id \
            JOIN organizations o ON o.id = up.organization \
            JOIN org_types_pl ot ON ot.id = o.org_type \
            WHERE up.id =" + transactions[index].user_id);

            userAccount = userAccount[0];
            console.log(userAccount);
            var blocks = await db.query("SELECT dc.*, ts.time_description FROM declared_capacity dc JOIN user_txns ut ON dc.txn_id = ut.id \
            JOIN time_slots ts ON ts.id = dc.time_block \
            WHERE plan_id=" + plan_id + " and version = " + transactions[index].version);

            response.txn_details[userAccount['org_name']] = transaction[0];
            response.capacity[userAccount['org_name']] = blocks;
        }

        res.send(response);
        return;
    }
    else if (req.user.org_type == "SLDC") {
        res.send({ status: '404', message: "isgs yet to upload capcity sheet." });
        return;
    }
    res.status(401);
    res.send({ message: 'Invalid user.' });
};

async function createPlan(data) {

    var plan_id = null;
    var result = await db.query("INSERT INTO distribution_plans SET ?", data);

    return plan_id = result.insertId;
}
const createCapacity = async (req, res) => {
    const results = [];
	
	
	var workbook = XLSX.readFile(req.file.path);
    var rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
     //res.send({ status: rows.length});  
	var count_t = 0;
	for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        var column = rows[rowIndex];
        if (column.length > 7) {
            if (column[0] == "Time Block")
                continue;
			var techminper = ((column[5] * 100)/55).toFixed(2);
			if((column[6] != techminper) && (count_t <=  101)){ 
			  var msg = "Incorrct value of techmin for time block "+ column[0] +", Tech min should be 55% of onBarInst value.";
			  res.send({ status: "failed", message: msg });	
			  return;
			}
		}	
		count_t++;
	}
	
	var count_tt = 0; var count_ttt = 1;
	for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        var column = rows[rowIndex];
		
        if (column.length > 7) {
            if (column[0] == "Time Block")
                continue;
			 var dc = rows[count_ttt][2];
			 var count_tttt = count_ttt + 1;
			 var dc1 = rows[count_tttt][2];
			 
            var dcdifference = (dc1 - dc);	
			if(count_tt <=  100){
            if((dcdifference > 0) && (dcdifference >= column[3])) {
			 var msg = "Capacity for time block "+ column[0] +" is changing more than allowed ramp up/down value";
			 res.send({ status: "failed", message: msg});	
			 return;
			}
			var dcdifference_pos = (dcdifference * -1);
			if((dcdifference < 0) && (dcdifference_pos >= column[4])) {
			 var msg = "Capacity for time block "+ column[0] +" is changing more than allowed ramp up/down value";
			 res.send({ status: "failed", message: msg});	
			 return;
			}
		 }	
			
		}	
		count_tt++; count_ttt++;
	}
	
	

    if (req.user.org_type != "ISGS") {
        res.status(403);
        res.send({ message: "User is not an ISGS user to upload declared capacity." });
        return; 
    }

    var result = await db.query("SELECT * FROM distribution_plans WHERE plan_date = " + mysql.escape(req.body.txn_date));
    var plan_id = 0;
    if (result.length == 0) { 
        var data = {
            plan_date: req.body.txn_date,
            plan_stage: 1
        }
        plan_id = await createPlan(data);
    }
    else
        plan_id = result[0].id;


    result = await db.query("SELECT * FROM user_txns WHERE plan_id = " + plan_id + " and user_id=" + req.user.user_id + " and txn_type=" + TransactionType.CAPCITY);

    lastVersion = 0;
    if (result.length > 0) {
        if (req.body.action_type == "upload") {
            res.json({ status: "409", message: "Already data uploaded for the date." });
            return;
        }
        else if (req.body.action_type == "reupload") {
            console.log("Reuploading file for plan : " + plan_id);
            var result = await db.query("SELECT max(version) as version FROM user_txns WHERE plan_id=" + plan_id + " and user_id=" + req.user.user_id + " and txn_type=" + TransactionType.CAPCITY);
            lastVersion = result[0].version;
        }
    } 
    // else if (result.length == 0) {
    //     if (req.body.action_type == "upload") {
    //         res.json({ status: "410", message: "Plan exists but transaction does not." });
    //         return;
    //     }
    // }    

    data = {
        user_id: req.user.user_id,
        plan_id: plan_id,
        txn_type: TransactionType.CAPCITY,
        txn_source: 1, 
        txn_base64: fs.readFileSync(req.file.path, { encoding: 'base64' }), 
        version: lastVersion + 1, 
        action_timestamp: new Date(),
        txn_status: 1
    }

    var result = await db.query("INSERT INTO user_txns SET ?", data);
    var txn_id = result.insertId;

    for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        var column = rows[rowIndex];
        if (column.length > 7) {
            if (column[0] == "Time Block")
                continue;
	         var data = {
                txn_id: txn_id,
                time_block: column[0], 
                capacity: column[2], 
                tech_min: column[5], 
                ramp_up: column[3], 
                ramp_down: column[4], 
                onBarInstCap: column[6], 
                updatedby: req.user.user_id
             }
			
			await db.query("INSERT INTO declared_capacity SET ?", data);
			
			if(rowIndex == 95){
			res.send({ status: "", message: "Uploaded successfully." });
			}
            /*try {
                await db.query("INSERT INTO declared_capacity SET ?", data);
            }
            catch (err) {

            }*/
        }
    }
	
	//res.send({ status: "", message: "Uploaded successfully." });
	
    fs.rm(req.file.path, function (err) {
        res.send({ status: "", message: "Uploaded successfully." });
    });
};

const publish = async function (req, res) {

    if (req.user.org_type != "ISGS") {
        res.status(403);    
        res.send({ message: "User is not an ISGS user to publish declared capacity." });
        return;
    }

    var user_id = req.user.user_id;
    var result = await db.query("SELECT user_id, max(version) as version FROM user_txns WHERE plan_id = "
        + req.query.plan_id + " AND txn_type=" + TransactionType.CAPCITY + " and user_id=" + req.user.user_id
        + " GROUP BY user_id");

    if (result.length == 0) {
        res.status(400);
        res.send({ message: "Invalid plan id." });
        return;
    }

    if (result[0].user_id != user_id) {
        res.status(403);
        res.send({ message: "The Capacity data is not upload by this user so cannot publish it." });
        return;
    }

    result = await db.query("UPDATE user_txns SET txn_status = 2 WHERE plan_id = "
        + req.query.plan_id + " AND txn_type=" + TransactionType.CAPCITY + " and user_id=" + req.user.user_id
        + " AND version=" + result[0].version);

    res.send({ message: "Capacity is published." });


}

const createDispatch = async (req, res) => {
    const results = [];

    if (req.user.org_type != "ISGS") {
        res.status(403);
        res.send({ message: "User is not an ISGS user to upload dispatch." });
        return;
    }

    var result = await db.query("SELECT * FROM distribution_plans WHERE plan_date = " + mysql.escape(req.body.txn_date));
    var plan_id = 0;
    if (result.length == 0) {
        var data = {
            plan_date: req.body.txn_date,
            plan_stage: 1
        }
        plan_id = await createPlan(data);
    }
    else
        plan_id = result[0].id;


    result = await db.query("SELECT * FROM user_txns WHERE plan_id = " + plan_id + " and user_id=" + req.user.user_id + " and txn_type=" + TransactionType.DISPATCH);

    lastVersion = 0;
    if (result.length > 0) {
        if (req.body.action_type == "upload") {
            res.json({ status: "409", message: "Already data uploaded for the date." });
            return;
        }
        else if (req.body.action_type == "reupload") {
            console.log("Reuploading file for plan : " + plan_id);
            var result = await db.query("SELECT max(version) as version FROM user_txns WHERE plan_id=" + plan_id + " and user_id=" + req.user.user_id + " and txn_type=" + TransactionType.DISPATCH);
            lastVersion = result[0].version;
        }
    }

    data = {
        user_id: req.user.user_id,
        plan_id: plan_id,
        txn_type: TransactionType.DISPATCH,
        txn_source: 1,
        txn_base64: fs.readFileSync(req.file.path, { encoding: 'base64' }),
        version: lastVersion + 1,
        action_timestamp: new Date(),
        txn_status: 1
    }

    var result = await db.query("INSERT INTO user_txns SET ?", data);
    var txn_id = result.insertId;

    var workbook = XLSX.readFile(req.file.path);
    var rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });

    for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        var column = rows[rowIndex];
        if (column.length > 7) {
            if (column[0] == "Time Block")
                continue;
            var data = {
                txn_id: txn_id,
                time_block: column[0],
                capacity: column[2],
                tech_min: column[5],
                ramp_up: column[3],
                ramp_down: column[4],
                onBarInstCap: column[6],
                updatedby: req.user.user_id
            }
            try {
                await db.query("INSERT INTO capacity_revisions SET ?", data);
            }
            catch (err) {

            }
        }
    }
    fs.rm(req.file.path, function (err) {
        res.send({ status: "", message: "Uploaded successfully." });
    });
};


const publishRevision = async function (req, res) {

    if (req.user.org_type != "ISGS") {
        res.status(403);
        res.send({ message: "User is not an ISGS user to publish capacity revisions." });
        return;
    }

    var user_id = req.user.user_id;
    var result = await db.query("SELECT user_id, max(version) as version FROM user_txns WHERE plan_id = "
        + req.query.plan_id + " AND txn_type=" + TransactionType.DISPATCH + " and user_id=" + req.user.user_id
        + " GROUP BY user_id");

    if (result.length == 0) {
        res.status(400);
        res.send({ message: "Invalid plan id." });
        return;
    }

    if (result[0].user_id != user_id) {
        res.status(403);
        res.send({ message: "The capacity revisions (dispatch) data is not upload by this user so cannot publish it." });
        return;
    }

    result = await db.query("UPDATE user_txns SET txn_status = 2 WHERE plan_id = "
        + req.query.plan_id + " AND txn_type=" + TransactionType.DISPATCH + " and user_id=" + req.user.user_id
        + " AND version=" + result[0].version);

    res.send({ message: "Capacity revisions (dispatch) is published." });


}

module.exports = {
    get: get,
    createCapacity: createCapacity,
    publish: publish,
    createDispatch: createDispatch,
    publishRevision: publishRevision
};