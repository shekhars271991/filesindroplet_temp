const path = require("path");
var mysql = require('mysql');

const db = require('../config/db');

const authenticate = async (req, res) => {
    console.log(req.body);
    var userid = await db.query("SELECT id FROM user_profiles WHERE user_name='"+req.body.username+ "'"+"AND password ="+"'"+req.body.password+"'")
    if(userid.length != 0){
        var accountsdetails = await db.query(" \
            SELECT up.id, full_name, ur.name as role, ot.name as org_type FROM user_profiles up \
            JOIN user_roles_pl ur ON up.role = ur.id \
            JOIN organizations o ON o.id = up.organization \
            JOIN org_types_pl ot ON ot.id = o.org_type \
            WHERE up.id ="+userid[0].id);
        const accounts ={
            name:accountsdetails[0].full_name,
            role:accountsdetails[0].role,
            user_id: accountsdetails[0].id,
            org_type: accountsdetails[0].org_type

         }
         res.send(accounts);
    }else{
        res.status(401);
        res.send({status:"UNAUTHORIZED"})
    }
    
}
module.exports = {
    authenticate:authenticate ,
};