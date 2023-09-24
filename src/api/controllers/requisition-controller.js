const path = require("path");
var mysql = require('mysql');
const fs = require('fs');
var XLSX = require('xlsx');

const TransactionType = require('../constants/transaction-types');
const db = require('../config/db');

const uploadRequisitions =  async (req, res) => {
     var datetime = new Date();
	 var date_c = datetime.toISOString().slice(0,10)+' '+ datetime.toISOString().slice(11,19)
	 //res.send({message:date_c});
    if(req.user.org_type != "SLDC") {
        res.status(403);
        res.send({message: "User is not an SLDC user to upload requisitions."});
        return ;
    }

    var result = await db.query("SELECT * FROM distribution_plans WHERE plan_date = " + mysql.escape(req.body.txn_date));
    var plan_id = 0;
    if(result.length == 0) {
        var data = {
            plan_date : req.body.txn_date,
            plan_stage : 1
        }
        plan_id = await createPlan(data);
    }
    else
        plan_id = result[0].id;

    //res.send({message:TransactionType.REQUISITION});    
    result = await db.query("SELECT * FROM user_txns WHERE plan_id = " + plan_id + " and user_id=" + req.user.user_id + " and txn_type=" + TransactionType.REQUISITION);

    lastVersion = 0;
    if(result.length > 0 ) {
        if(req.body.action_type == "upload") {
            res.json({status : "409", message: "Already data uploaded for the date."});
            return ;
        }
        else if(req.body.action_type == "reupload") {
            console.log("Reuploading file for plan : " + plan_id);
            var result = await db.query("SELECT max(version) as version FROM user_txns WHERE plan_id=" + plan_id + " and user_id=" + req.user.user_id + " and txn_type=" + TransactionType.REQUISITION);
            lastVersion = result[0].version;
        } 
    }

    data = {
        user_id : req.user.user_id,
        plan_id : plan_id,
        txn_type : TransactionType.REQUISITION,
        txn_source : 1,
        txn_base64 : fs.readFileSync(req.file.path, {encoding: 'base64'}),
        version : lastVersion + 1,
        action_timestamp: new Date(),
        txn_status: 1
    }

    var result = await db.query("INSERT INTO user_txns SET ?", data);
    var txn_id = result.insertId;

    let declared_capacity_orgs = await db.query(
        "SELECT ot.name as org_type, ut.user_id, o.name as org_name, max(ut.id) as txn_id FROM user_txns ut \
        JOIN user_profiles up ON up.id = ut.user_id \
        JOIN organizations o ON o.id = up.organization \
        JOIN org_types_pl ot ON o.org_type = ot.id \
        WHERE ut.plan_id = " + plan_id + " AND txn_type = " + TransactionType.CAPCITY + " AND ot.name = 'ISGS'"
        + " GROUP BY ot.name, ut.user_id, o.name");

    if(declared_capacity_orgs.length == 0 ) {
        res.status(404);
        res.send({message: 'Capacity is not uploaded yet.'});
        return ;
    }
    let entitlement_txns = await db.query(
        "SELECT ot.name as org_type, ut.user_id, o.name as org_name, max(ut.id) as txn_id FROM user_txns ut \
        JOIN user_profiles up ON up.id = ut.user_id \
        JOIN organizations o ON o.id = up.organization \
        JOIN org_types_pl ot ON o.org_type = ot.id \
        WHERE ut.plan_id = " + plan_id + " AND txn_type = " + TransactionType.ENTITLEMENTS 
        + " GROUP BY ot.name, ut.user_id, o.name");

    if(entitlement_txns.length == 0 ) {
        res.status(404);
        res.send({message: 'Entitlements are not calculated yet.'});
        return ;
    }
    var workbook = XLSX.readFile(req.file.path);
    var rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header:1});
    //res.send({message:rows}); 
    for(var rowIndex = 1; rowIndex < rows.length; rowIndex++) {
        var column = rows[rowIndex];
        if(column.length >= 3 ) {
            if((column[0] + "").toLowerCase() == "time block id")   
                continue;

            for(let index = 0; index < declared_capacity_orgs.length; index ++ ) {
				var sql = "INSERT INTO requisitions (txn_id, time_block, isgs_id, sldc_id, requisitioned_power, updatedby, updatedts, softdeleteflag)\
                VALUES(" + txn_id + ", "+ column[0] +", " + declared_capacity_orgs[index].user_id
                + "," + req.user.user_id + ", " + column[2] +  " , "+ req.user.user_id + ", '" + date_c + "', 0 )";
				//res.send({message:sql});
                /*await db.query("INSERT INTO requisitions (txn_id, time_block, isgs_id, sldc_id, requisitioned_power, updatedby, updatedts, softdeleteflag)\
                SELECT " + txn_id + ", ea.time_block, " + declared_capacity_orgs[index].user_id
                + "," + req.user.user_id + ", " + column[2] +  " * allocation_percent / 100, " + req.user.user_id + 
                ", now(), 0 FROM entitlement_allocations ea  \
                WHERE ea.end_date is null " //+ entitlement_txns[0].txn_id 
                + " AND ea.sldc_id=" + req.user.user_id + " AND ea.isgs_id = " + declared_capacity_orgs[index].user_id 
                + " AND ea.time_block = " + column[0]);*/
				await db.query(sql);
            }
        }
    }
	
    fs.rm(req.file.path, function(err){
        res.send({status:"", message: "Uploaded successfully."});    
    });
};


const publish = async function(req, res) {

    if(req.user.org_type != "SLDC") {
        res.status(403);
        res.send({message: "User is not an SLDC user to publish requisitions."});
        return ;
    }

    var user_id = req.user.user_id;
    var result = await db.query("SELECT user_id, max(version) as version FROM user_txns WHERE plan_id = " 
    + req.query.plan_id + " AND txn_type=" + TransactionType.REQUISITION + " and user_id=" + req.user.user_id
    + " GROUP BY user_id");

    if(result.length == 0 ) {
        res.status(400);
        res.send({message:"Invalid plan id."});
        return ;
    }

    if(result[0].user_id != user_id) {
        res.status(403);
        res.send({message:"The requisition data is not upload by this user so cannot publish it."});
        return ;
    }

    result = await db.query("UPDATE user_txns SET txn_status = 2 WHERE plan_id = " 
    + req.query.plan_id + " AND txn_type=" + TransactionType.REQUISITION + " and user_id=" + req.user.user_id
    + " AND version=" + result[0].version);

    res.send({status:'Yes', message: "Requisition  is published."});
    


}

const uploadRequisitionRevision =  async (req, res) => {
 
    if(req.user.org_type != "SLDC") {
        res.status(403);
        res.send({message: "User is not an SLDC user to upload requisitions."});
        return ;
    }

    var result = await db.query("SELECT * FROM distribution_plans WHERE plan_date = " + mysql.escape(req.body.txn_date));
    var plan_id = 0;
    if(result.length == 0) {
        var data = {
            plan_date : req.body.txn_date,
            plan_stage : 1
        }
        plan_id = await createPlan(data);
    }
    else
        plan_id = result[0].id;

        
    result = await db.query("SELECT * FROM user_txns WHERE plan_id = " + plan_id + " and user_id=" + req.user.user_id + " and txn_type=" + TransactionType.DRAWL);

    lastVersion = 0;
    if(result.length > 0 ) {
        if(req.body.action_type == "upload") {
            res.json({status : "409", message: "Already data uploaded for the date."});
            return ;
        }
        else if(req.body.action_type == "reupload") {
            console.log("Reuploading file for plan : " + plan_id);
            var result = await db.query("SELECT max(version) as version FROM user_txns WHERE plan_id=" + plan_id + " and user_id=" + req.user.user_id + " and txn_type=" + TransactionType.DRAWL);
            lastVersion = result[0].version;
        } 
    }

    data = {
        user_id : req.user.user_id,
        plan_id : plan_id,
        txn_type : TransactionType.DRAWL,
        txn_source : 1,
        txn_base64 : fs.readFileSync(req.file.path, {encoding: 'base64'}),
        version : lastVersion + 1,
        action_timestamp: new Date(),
        txn_status: 1
    }

    var result = await db.query("INSERT INTO user_txns SET ?", data);
    var txn_id = result.insertId;

    let declared_capacity_orgs = await db.query(
        "SELECT ot.name as org_type, ut.user_id, o.name as org_name, max(ut.id) as txn_id FROM user_txns ut \
        JOIN user_profiles up ON up.id = ut.user_id \
        JOIN organizations o ON o.id = up.organization \
        JOIN org_types_pl ot ON o.org_type = ot.id \
        WHERE ut.plan_id = " + plan_id + " AND txn_type = " + TransactionType.CAPCITY + " AND ot.name = 'ISGS'"
        + " GROUP BY ot.name, ut.user_id, o.name");

    if(declared_capacity_orgs.length == 0 ) {
        res.status(404);
        res.send({message: 'Capacity is not uploaded yet.'});
        return ;
    }
    let entitlement_txns = await db.query(
        "SELECT ot.name as org_type, ut.user_id, o.name as org_name, max(ut.id) as txn_id FROM user_txns ut \
        JOIN user_profiles up ON up.id = ut.user_id \
        JOIN organizations o ON o.id = up.organization \
        JOIN org_types_pl ot ON o.org_type = ot.id \
        WHERE ut.plan_id = " + plan_id + " AND txn_type = " + TransactionType.ENTITLEMENTS 
        + " GROUP BY ot.name, ut.user_id, o.name");

    if(entitlement_txns.length == 0 ) {
        res.status(404);
        res.send({message: 'Entitlements are not calculated yet.'});
        return ;
    }
    var workbook = XLSX.readFile(req.file.path);
    var rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header:1});

    for(var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        var column = rows[rowIndex];
        if(column.length >= 3 ) {
            if((column[0] + "").toLowerCase() == "time block id")   
                continue;

            for(let index = 0; index < declared_capacity_orgs.length; index ++ ) {
                await db.query("INSERT INTO requisition_revisions (txn_id, time_block, isgs_id, sldc_id, energy, updatedby, updatedts, softdeleteflag)\
                SELECT " + txn_id + ", ea.time_block, " + declared_capacity_orgs[index].user_id
                + "," + req.user.user_id + ", " + column[2] +  " * allocation_percent / 100, " + req.user.user_id + 
                ", now(), 0 FROM entitlement_allocations ea  \
                WHERE ea.end_date is null " //+ entitlement_txns[0].txn_id 
                + " AND ea.sldc_id=" + req.user.user_id + " AND ea.isgs_id = " + declared_capacity_orgs[index].user_id 
                + " AND ea.time_block = " + column[0]);
            }
        }
    }
    fs.rm(req.file.path, function(err){
        res.send({status:"", message: "Uploaded successfully."});    
    });
};

const publishRevision = async function(req, res) {

    if(req.user.org_type != "SLDC") {
        res.status(403);
        res.send({message: "User is not an SLDC user to publish requisitions."});
        return ;
    }

    var user_id = req.user.user_id;
    var result = await db.query("SELECT user_id, max(version) as version FROM user_txns WHERE plan_id = " 
    + req.query.plan_id + " AND txn_type=" + TransactionType.DRAWL + " and user_id=" + req.user.user_id
    + " GROUP BY user_id");

    if(result.length == 0 ) {
        res.status(400);
        res.send({message:"Invalid plan id."});
        return ;
    }

    if(result[0].user_id != user_id) {
        res.status(403);
        res.send({message:"The requisition data is not upload by this user so cannot publish it."});
        return ;
    }

    result = await db.query("UPDATE user_txns SET txn_status = 2 WHERE plan_id = " 
    + req.query.plan_id + " AND txn_type=" + TransactionType.DRAWL + " and user_id=" + req.user.user_id
    + " AND version=" + result[0].version);

    res.send({message: "Requisition revision is published."});
    

}

module.exports = {
    uploadRequisitions: uploadRequisitions,
    publish:publish,
    uploadRequisitionRevision:uploadRequisitionRevision,
    publishRevision:publishRevision

}