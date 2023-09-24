const cron = require("node-cron");
var mysql = require('mysql');
const db = require('../config/db');
const TransactionType = require('../constants/transaction-types');
const PlanStages = require('../constants/plan-stages');

const markAsPublished = async (action_date, transactionType) => {
    var result = await db.query("SELECT plan_id, user_id, max(version) as max_version FROM usr_txns ut JOIN distribution_plans dp ON dp.id = ut.plan_id \
     WHERE plan_date='" + action_date + "' AND txn_type=" + transactionType + " AND txn_status = 1 \
     GROUP BY plan_id, user_id");

    for(let index = 0; index < result.length; index++) {
        await db.query("UPDATE user_txns SET txn_status = 2 WHERE txn_status = 1 and plan_id =" + result[index].plan_id 
        + " AND user_id=" + result[index].user_id + " AND version =" + result[index].max_version + " AND txn_type=" + transactionType);
    }
}


// Runs everyday on 6AM
cron.schedule("0 0 6 1/1 * ? *", function(){
    var action_date = new Date().getFullYear() + "-" + (new Date().getMonth() + 1) + "-" + (new Date().getDate());
    await markAsPublished(action_date, TransactionType.CAPCITY);
    await db.query("UPDATE distribution_plans SET plan_stage = " + PlanStages.CAPACITY_DECLARED + " WHERE plan_stage = " + PlanStages.INITIAL + " and plan_date ='" + action_date + "'" );
    
});
// Runs everyday on 8AM
cron.schedule("0 0 8 1/1 * ? *", function(){
    var action_date = new Date().getFullYear() + "-" + (new Date().getMonth() + 1) + "-" + (new Date().getDate());
    await markAsPublished(action_date, TransactionType.ENTITLEMENTS);
    await db.query("UPDATE distribution_plans SET plan_stage = " + PlanStages.ENTITLEMENTS_PUBLISHED + " WHERE plan_stage = " + PlanStages.CAPACITY_DECLARED + " and plan_date ='" + action_date + "'"  );
});

// Runs everyday on 3PM
cron.schedule("0 0 15 1/1 * ? *", function(){
    var action_date = new Date().getFullYear() + "-" + (new Date().getMonth() + 1) + "-" + (new Date().getDate());
    await markAsPublished(action_date, TransactionType.REQUISITION);
    await db.query("UPDATE distribution_plans SET plan_stage = " + PlanStages.REQUISITIONS_PUBLISHED + " WHERE plan_stage = " + PlanStages.ENTITLEMENTS_PUBLISHED + " and plan_date ='" + action_date + "'"  );
});


// Runs everyday on 6PM
cron.schedule("0 0 18 1/1 * ? *", function(){
    var action_date = new Date().getFullYear() + "-" + (new Date().getMonth() + 1) + "-" + (new Date().getDate());
    // TODO Calculate the provisional
    await markAsPublished(action_date, TransactionType.PROVISIONAL);
    await db.query("UPDATE distribution_plans SET plan_stage = " + PlanStages.PROVISIONAL_SCHEDULE_PUBLISHED + " WHERE plan_stage = " + PlanStages.REQUISITIONS_PUBLISHED + " and plan_date ='" + action_date + "'"  );
});

// Runs everyday on 10PM
cron.schedule("0 0 22 1/1 * ? *", function(){
    var action_date = new Date().getFullYear() + "-" + (new Date().getMonth() + 1) + "-" + (new Date().getDate());
    await markAsPublished(action_date, TransactionType.DISPATCH);
    await markAsPublished(action_date, TransactionType.DRAWL);
    await db.query("UPDATE distribution_plans SET plan_stage = " + PlanStages.REVISIONS_PUBLISHED + " WHERE plan_stage = " + PlanStages.PROVISIONAL_SCHEDULE_PUBLISHED + " and plan_date ='" + action_date + "'"  );
});

// Runs everyday on 11PM
cron.schedule("0 0 23 1/1 * ? *", function(){
    await db.query("UPDATE distribution_plans SET plan_stage = " + PlanStages.FINAL_SCHEDULE_PUBLISHED + " WHERE plan_stage = " + PlanStages.REVISIONS_PUBLISHED + " and plan_date ='" + action_date + "'"  );
});
