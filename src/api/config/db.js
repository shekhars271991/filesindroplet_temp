const util = require( 'util' );
const DB_CONFIG = require('./db.config');
const mysql = require('mysql');

const dbConn = mysql.createConnection({
    host: DB_CONFIG.HOST,
    user: DB_CONFIG.USER,
    password: DB_CONFIG.PASSWORD,
    database: DB_CONFIG.DB
});

dbConn.connect(function (err) {
    if (err) throw err;
    console.log("Database Connected!");
});

function makeDb() {
    const connection = dbConn;
    return {
      query( sql, args ) {
        return util.promisify( connection.query )
          .call( connection, sql, args );
      },
      close() {
        return util.promisify( connection.end ).call( connection );
      }
    };
  }

module.exports = makeDb();