/*
  Required modules
	ibm_db: for connecting and querying a DB2 database
	minimist: for reading command line args
*/
try {
	var ibmdb = require('ibm_db');
	var minimist  = require('minimist');
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
			return (-1);
		}
	}
}

console.log("Attempting to connect to DB2 database...");

/*
    Connect to the database server
    param 1: The DSN string which has the details of database name to connect to, user id, password, hostname, portnumber 
    param 2: The Callback function to execute when connection attempt to the specified database is completed
*/
ibmdb.open("DRIVER={DB2};DATABASE=" + args.d + ";UID=" + args.u + ";PWD=" + args.w + ";HOSTNAME=" + args.h + ";port=" + args.p, function(err, conn)
{
        if(err) {
		/*
		    On error in connection, log the error message on console 
		*/
          	console.error("error: ", err.message);
        } else {

		/*
			On successful connection issue the SQL query by calling the query() function on Database
			param 1: The SQL query to be issued
			param 2: The callback function to execute when the database server responds
		*/
		conn.query("SELECT * FROM <TABLE>", function(err, records, moreResultSets) {

            console.log("<ATTR1> \t <ATTR2> \t <ATTR3> \t <ATTR4> \t <ATTR5>");
			console.log("------- \t ------- \t ------- \t ------- \t -------");

			/*
				Loop through the rows returned from the select query and print.
				Requires knowledge of at least some of the target attributes.
			*/
            for (var i = 0; i < records.length; i++)
			{
				console.log(records[i].ATTR1, "\t",
							records[i].ATTR2, "\t",
							records[i].ATTR3, "\t",
							records[i].ATTR4, "\t",
							records[i].ATTR5
				);
			}
			console.log("---------------------------------------------------------");

			/*
				Close the connection to the database.
				param 1: The callback function to execute on completion of close function.
			*/
			conn.close(function(){
				console.log("Connection Closed.");
			});
		});
	}
});
