/*
  Required modules
	ibm_db: for connecting and querying a DB2 database
	minimist: for reading command line args
*/
try {
	var ibmdb = require('ibm_db');
	var minimist  = require('minimist');
	var assert = require('assert');
} catch (e) {
	console.log("error: one or more modules are not installed");
	console.log(e);
}

var args = minimist(process.argv.slice(2));
var validOptions = ["d", "u", "w", "h", "p"];

/*
  	Basic validation of command line args
*/

if (Object.keys(args).length !== 6) {
	console.log("Usage: node db2test.js -d <database> -u <user> -w <password> -h <host> -p <port>");
	return (-1);
}

for (var key in args) {
	if (args.hasOwnProperty(key)) {
		if (key !== "_" && validOptions.indexOf(key) === -1) {
			console.log("error: invalid argument specified: " + key);
			console.log("Usage: node db2test.js -d <database> -u <user> -w <password> -h <host> -p <port>");
			process.exit(-1);
		}
	}
}

var connectionString = "DRIVER={DB2};DATABASE=" + args.d + ";UID=" + args.u + ";PWD=" + args.w + ";HOSTNAME=" + args.h + ";port=" + args.p;

console.log("\nAttempting to connect to DB2 database...");

/*
    Connect to the database server
      param 1: The DSN string which has the details of database name to connect to, user id, password, hostname, portnumber 
      param 2: The Callback function to execute when connection attempt to the specified database is completed
*/
ibmdb.open(connectionString, function(err, conn)
{
        if (err) {
          	console.error("error: connection to database failed: ", err.message);
          	process.exit(-1);
        }

       	console.log("Connection successful.\n");

       	/*
			Set up a stored procedure with parameters
       	*/
       	var schema = "DB2INST1";
		var proc1 = "create or replace procedure " + schema + ".proc1" +
       				"(IN v1 INTEGER, OUT v2 INTEGER, INOUT v3 VARCHAR(20)) " +
       				"BEGIN set v2 = v1 + 1; set v3 = 'verygood'; END";
		var query = "call " + schema + ".proc1(?, ?, ?)";

		/*
			Create stored procedure in DB2
			  querySync: synchronously issue a SQL query to the database that is currently open
			    param1: sqlQuery: the SQL query to be executed
			    param2: bindingParameters (optional): an array of values that will be bound to any '?' characters in sqlQuery
		*/
		conn.querySync(proc1);

       	/*
       		bindingParameters
       		  paramType: type of the parameter (INPUT, OUTPUT, INOUT, FILE)
       		  DataType: data type (aka column type) of the parameter on the server. Default is CHAR.
       		  Data: actual data value for the parameter
       		  Length: (for CHAR datatype) specifies the max length of the data
       	*/
       	var param1 = {ParamType:"INPUT", DataType:"INTEGER", Data:0};
	    var param2 = {ParamType:"OUTPUT", DataType:"INTEGER", Data:0};
		var param3 = {ParamType:"INOUT", DataType:"CHAR", Data:"test", Length:30};

		/*
			Now that the stored procedure has been created we can call it
			  Each '?' in the query will be replaced by the defined param
			  Driver will throw an error if the number of params don't match
		*/
		var results = conn.querySync(query, [param1, param2, param3]);
		
		/*
			Do something with the result
		*/
		console.log("Results from SP1:");
		console.log(results + "\n");

		/*
			Remove the stored procedure from the database
		*/
		conn.querySync("drop procedure " + schema + ".proc1(INT, INT, VARCHAR(20))");

		/*
			Create a second stored procedure
			  Returns an array [v2, resultSet]
		*/
		conn.querySync("create or replace procedure " + schema + ".proc2(IN v1 VARCHAR(20), OUT v2 VARCHAR(20)) " +
					   "dynamic result sets 1 language sql BEGIN declare cr1 cursor with return for select CHRHOSTNAME from TSYSTEM where CHRHOSTNAME = v1; open cr1; set v2 = 'SUCCESS'; END");
		param1 = {ParamType:"INPUT", DataType:"CHAR", Data:"NotificationDefaults", Length:30};
		param2 = {ParamType:"OUTPUT", DataType:"CHAR", Data:"placeholder", Length:30};
		results = conn.querySync("call " + schema + ".proc2(?, ?)", [param1, param2]);
		console.log("Results from SP2:\n" + results[0] + "\n");
		for (var i = 0; i < results[1].length; i++) {
			console.log(results[1][i].CHRHOSTNAME);
		}
		conn.querySync("drop procedure " + schema + ".proc2(VARCHAR(20), VARCHAR(20))");

		/*
			Assuming a stored procedure has already been created,
			we can just call it using the following:
		*/
		// var param1 = {ParamType:"INPUT", DataType:"TYPE", Data:"data"};
		// var param2 = {ParamType:"OUTPUT", DataType:"TYPE", Data:"data"};
		// var result = conn.query("CALL DATABASE.PROCEDURE_NAME(?, ?)", [param1, param2]);

		/*
			On successful connection issue the SQL query by calling the async query() function on the database
			  param 1: The SQL query to be issued
			  param 2: The callback function to execute when the database server responds
		*/
		conn.query("SELECT * FROM TSYSTEM", function(err, records, moreResultSets) {

            console.log("\nINTSYSTEMID \t CHRHOSTNAME \t\t\t CHRTYPE \t INTHTTPPORT \t CHRHTTPINTERFACE");
			console.log("----------- \t ----------- \t\t\t ------- \t ----------- \t ----------------");

			/*
				Loop through the rows returned from the select query and print
				  Requires knowledge of at least some of the target attributes
			*/
            for (var i = 0; i < records.length; i++)
			{
				console.log(records[i].INTSYSTEMID, "\t\t",
							records[i].CHRHOSTNAME,
							records[i].CHRTYPE, "\t\t",
							records[i].INTHTTPPORT, "\t\t",
							records[i].CHRHTTPINTERFACE
				);
			}
			console.log("-------------------------------------------------------------------------------------------------");

			/*
				Close the connection to the database.
				  param 1: The callback function to execute on completion of close function.
			*/
			conn.close(function(){
				console.log("\nConnection Closed.\n");
			});
		});
});
