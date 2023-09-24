const path = require("path");
var mysql = require('mysql');
const fs = require('fs');
var XLSX = require('xlsx');

const TransactionType = require('../constants/transaction-types');
const db = require('../config/db');

const getAllOrgByType = async function(orgType) {
    return await db.query("select up.id as user_id, o.name from organizations o \
     JOIN org_types_pl ot ON o.org_type = ot.id \
     JOIN user_profiles up ON up.organization = o.id WHERE ot.name = '" + orgType + "'");
}

const getAllocatedEntitlementsFor = async function(sldc, isgs) {
    return await await db.query("SELECT time_block, time_description, allocation_percent FROM dgmsdb.entitlement_allocations ea \
    JOIN time_slots ts ON ea.time_block = ts.id \
    JOIN user_profiles ups ON ea.sldc_id = ups.id \
    JOIN organizations o ON ups.organization = o.id \
    JOIN user_profiles upi ON ea.isgs_id = upi.id \
    JOIN organizations oi ON upi.organization = oi.id \
    WHERE o.name = '" + sldc + "' and oi.name='" + isgs + "' and end_date is null;");
}

const getEntitlementsFor = async function(sldc_id, isgs_id, txn_id) {
    return await await db.query("SELECT time_block, time_description, entitled_power \
    FROM dgmsdb.entitlements e \
    JOIN time_slots ts ON e.time_block = ts.id \
    JOIN user_profiles ups ON e.sldc_id = ups.id \
    JOIN organizations o ON ups.organization = o.id \
    JOIN user_profiles upi ON e.isgs_id = upi.id \
    JOIN organizations oi ON upi.organization = oi.id \
    WHERE ups.id = '" + sldc_id + "' and upi.id='" + isgs_id + "' and e.txn_id=" + txn_id);
}



const getActiveEntitlements = async() => {
    var sldcOrgs = await getAllOrgByType('SLDC');
    var isgsOrgs = await getAllOrgByType('ISGS');
    
    var response = {};
    for(var si = 0; si < sldcOrgs.length; si++) {
        for(var ii = 0; ii < isgsOrgs.length; ii++) {
            var result = await getAllocatedEntitlementsFor(sldcOrgs[si].name , isgsOrgs[ii].name);
            if(result.length > 0) {
                if(response[sldcOrgs[si].name] == undefined)
                    response[sldcOrgs[si].name] = {};
                response[sldcOrgs[si].name][isgsOrgs[ii].name] = result; 
            }
        }
    }
    return response;
}

const getAllocatedEntitlements = async (req, res) => {
    
    res.send(await getActiveEntitlements());
}

const getSLDCEntitlements = async (req, res) => {
    let transaction_id = mysql.escape(req.query.transaction_id);
    let response = {};
    if(req.user.org_type == "SLDC") {
        let isgsOrgs = await getAllOrgByType('ISGS');
        for(let ii = 0; ii < isgsOrgs.length; ii++) {
            let result = await getEntitlementsFor(req.user.user_id, isgsOrgs[ii].user_id, transaction_id);
            if(result.length > 0)
                response[isgsOrgs[ii].name] = result;
        }
        res.send(response);
    }
    else {
        res.status(401);
        res.send({message: "Invalid user"});
    }
}

const getISGSEntitlements = async (req, res) => {
    let transaction_id = mysql.escape(req.query.transaction_id);
    let response = {};
    if(req.user.org_type == "ISGS") {
        let sldcOrgs = await getAllOrgByType('SLDC');
        for(let ii = 0; ii < sldcOrgs.length; ii++) {
            let result = await getEntitlementsFor(sldcOrgs[ii].user_id, req.user.user_id, transaction_id);
            if(result.length > 0)
                response[sldcOrgs[ii].name] = result;
        }
        res.send(response);
    }
    else {
        res.status(401);
        res.send({message: "Invalid user"});
    }
}

const uploadEntitlements =  async (req, res) => {
 
    var today = new Date();
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+ today.getDate();
    var previousDate = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+ (today.getDate() - 1);

    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
            
    var dateTime = date+' '+time;

    var data = {};
    var workbook = XLSX.readFile(req.file.path);
    var rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header:1});
   
    await db.query("UPDATE entitlement_allocations SET end_date='" + previousDate + " 23:59:59" + "' WHERE end_date is null"); 
    for(var rowIndex = 2; rowIndex < rows.length; rowIndex++) {
        
        var column = rows[rowIndex];
        var sldcId = "";
        var isgsId = "";
        console.log(column);
        
       
        if(column.length > 5) {
            if(column[0] == "Time block")   
                continue;
            sldcId = 3; // Delhi
            isgsId = 5; // Dadri
            data = {
                time_block : column[0],
                sldc_id: sldcId,
                isgs_id: isgsId,
                allocation_percent: column[2],
                start_date : dateTime         
            }
            await db.query("INSERT INTO entitlement_allocations SET ?" , data); 
        
            sldcId = 3; // Delhi
            isgsId = 6; // Badarpur
            data = {
                time_block : column[0],
                sldc_id: sldcId,
                isgs_id: isgsId,
                allocation_percent: column[3],
                start_date :dateTime          
            }
            await db.query("INSERT INTO entitlement_allocations SET ?" , data); 
        
            sldcId = 4; // UP
            isgsId = 5; // Dadri
            data = {
                time_block : column[0],
                sldc_id: sldcId,
                isgs_id: isgsId,
                allocation_percent: column[4],
                start_date : dateTime           
            }
            await db.query("INSERT INTO entitlement_allocations SET ?" , data); 
        
            sldcId = 4; // UP
            isgsId = 6; // Badarpur
            data = {
                time_block : column[0],
                sldc_id: sldcId,
                isgs_id: isgsId,
                allocation_percent: column[5],
                start_date : dateTime           
            }
            await db.query("INSERT INTO entitlement_allocations SET ?" , data); 
        }
    }
    
    res.send({status: "ok"})
};

const calculateEntitlements = async function(req, res) {
    
    /*let transaction_id = mysql.escape(req.query.transaction_id);
    let plan_id = await db.query("SELECT plan_id FROM user_txns WHERE id = " + transaction_id)
    if(plan_id.length == 0) {
        res.status(404);
        res.send({message: 'Transaction does not exists.'});
        return ;
    }*/

    let plan_id = req.query.plan_id;
    // Check for the plan already entitlement is calculated
    let entitlementList = await db.query("SELECT * FROM user_txns WHERE plan_id =" + plan_id + " and txn_type=" + TransactionType.ENTITLEMENTS + " and user_id=" + req.user.user_id);
    let lastVersion = 0;
    if(entitlementList.length > 0) {
        let result = await db.query("SELECT max(version) as version FROM user_txns WHERE plan_id=" + plan_id + " and txn_type=" + TransactionType.ENTITLEMENTS + " and user_id=" + req.user.user_id);
        lastVersion = result[0].version;
        
    }
    
    let data = {
        user_id : req.user.user_id,
        plan_id : plan_id,
        txn_type : TransactionType.ENTITLEMENTS,
        txn_source : 2,
        txn_base64 : null,
        version : lastVersion + 1,
        action_timestamp: new Date(),
        txn_status: 1
    }   
    result = await db.query("INSERT INTO user_txns SET ?", data);
    let txn_id = result.insertId;

    // Get the declared capacity for the transactions.
    let declared_capacity_orgs = await db.query(
        "SELECT ot.name as org_type, ut.user_id, o.name as org_name, max(ut.id) as txn_id FROM user_txns ut \
        JOIN user_profiles up ON up.id = ut.user_id \
        JOIN organizations o ON o.id = up.organization \
        JOIN org_types_pl ot ON o.org_type = ot.id \
        WHERE ut.plan_id = " + plan_id + " AND txn_type = " + TransactionType.CAPCITY + " AND ot.name = 'ISGS'"
        + " GROUP BY ot.name, ut.user_id, o.name");


        let response = {};
    if(declared_capacity_orgs.length > 0) {
        let sldcOrgs = await getAllOrgByType('SLDC');
        for(let sIndex = 0; sIndex < sldcOrgs.length; sIndex++) {
            let sldc = sldcOrgs[sIndex];
            console.log(sldc);
            for(let index = 0; index < declared_capacity_orgs.length; index ++ ) {
                await db.query("INSERT INTO entitlements (txn_id, time_block, isgs_id, sldc_id, entitled_power, updatedby, updatedts, softdeleteflag)\
                SELECT " + txn_id + ", dc.time_block, " + declared_capacity_orgs[index].user_id
                + "," + sldc.user_id + ", capacity * allocation_percent / 100, " + req.user.user_id + 
                ", now(), 0 FROM declared_capacity dc  \
                JOIN entitlement_allocations ea ON dc.time_block = ea.time_block and ea.end_date is null\
                WHERE dc.txn_id = " + declared_capacity_orgs[index].txn_id 
                + " AND ea.sldc_id=" + sldc.user_id + " AND ea.isgs_id = " + declared_capacity_orgs[index].user_id);

                let entitlementResult = await getEntitlementsFor(sldc.user_id , declared_capacity_orgs[index].user_id, txn_id);
                if(entitlementResult.length > 0) {
                    if(response[sldc.name] == undefined)
                        response[sldc.name] = {};
                    response[sldc.name][declared_capacity_orgs[index].org_name] = entitlementResult; 
                }
            }
        }
    }

   
    res.send({status:'Yes', entitlement_txn_id: txn_id, data : response});
}


const publish = async function(req, res) {

    if(req.user.org_type != "RLDC") {
        res.status(403);
        res.send({message: "User is not an RLDC user to publish declared capacity."});
        return ;
    }

    var user_id = req.user.user_id;
    var result = await db.query("SELECT user_id, max(version) as version FROM user_txns WHERE plan_id = " 
    + req.query.plan_id + " AND txn_type=" + TransactionType.ENTITLEMENTS + " and user_id=" + req.user.user_id
    + " GROUP BY user_id");

    if(result.length == 0 ) {
        res.status(400);
        res.send({message:"Invalid plan id."});
        return ;
    }

    if(result[0].user_id != user_id) {
        res.status(403);
        res.send({message:"The entitlement data is not upload by this user so cannot publish it."});
        return ;
    }

    db.query("UPDATE user_txns SET txn_status = 2 WHERE plan_id = " 
    + req.query.plan_id + " AND txn_type=" + TransactionType.ENTITLEMENTS + " and user_id=" + req.user.user_id
    + " AND version=" + result[0].version);
	
	result = await db.query("UPDATE distribution_plans SET plan_stage = 3 WHERE id = " + req.query.plan_id );

    res.send({status:'Yes', message: "Entitlement is published."});
    

}

module.exports = {
    entitlementUpload: uploadEntitlements,
    getAllocatedEntitlements : getAllocatedEntitlements,
    getISGSEntitlements: getISGSEntitlements,
    getSLDCEntitlements: getSLDCEntitlements,
    calculateEntitlements: calculateEntitlements,
    publish: publish
};  
