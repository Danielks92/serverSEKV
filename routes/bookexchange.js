/*
 * DB stuff
 */
var mongo = require('mongodb'),
	BSON = mongo.BSONPure,
	Server = mongo.Server,
	server = new Server('localhost', 27017, {auto_reconnect: true}),
	DB = mongo.Db,
	db = new DB('bookexchangedb', server),

	/*
	 * requiring packet and credentials for mailing
	 */
	nodemailer = require('nodemailer'),
	//mailcreds = require('./mailcreds'),
	
	/*
	 * crypto stuff
	 */
	bcrypt = require('bcrypt-nodejs'),
	crypto = require('crypto');
 	
	
/*
 * establishes the db-connection
 */ 
db.open(function(err, db){
	if(!err){
		console.log("Connected to 'bookexchangedb' database.");
	}else{
		console.log("Problem connecting to 'bookexchangedb' database.");
	}
});


	/*
	* checks every minute if an auction is expired.
	* if that is the case the auction will be deleted from the allView
	* and recreated in the completed view (until the seller deletes it)
	*/


var minutes = 1, the_interval = minutes * 60 * 1000;
setInterval(function() {
	var mongo = require('mongodb');
	

	
	console.log("Running auction_expired_job - interval set to " + minutes + " minutes");
 db.collection('auction', function(err, collection){
			
			var cursor = collection.find();
				cursor.each(function(err, item){
					if(item == null) {
						cursor.toArray(function(err, item) {
						});
					}else{
						console.log((Math.abs(new Date(item.date) - new Date()))  / (1000*60*60*24));
						var dateAuction = new Date (item.date);
						var dateToday = new Date();
						if(dateAuction < dateToday){
							var o_id = new mongo.ObjectId(item._id);
							console.log("expired - " + console.log(item.bookTitle));
							db.collection('completed', function (err, collection){
								collection.insert({'bookTitle': item.bookTitle, 'condition': item.condition, 'userCreate': item.userCreate, 'currentPrice': item.currentPrice, 'currentUser' : item.currentUser}, {safe:true}, function(err, result) {
									if(err){
										console.log("error with insert " + err.toString());
									}else{
										console.log("insert successfully");
									}
								});
							});
							collection.remove({'_id': o_id}, function(err, result){
								if(err){
									console.log("error with removing " + item.bookTitle);
								}else{
									console.log(item.bookTitle + " removed");
								}
								});
						}else{
							console.log("still running - " + item.bookTitle);
						}
				}
				});
 });
				
}, the_interval);



/*
* updates the price of a given auction
*
*/

exports.updateCurrentPrice = function(req, res) {
	
    var data = req.body;
	var mongo = require('mongodb');
	var o_id = new mongo.ObjectId(data._id);
	
	
	console.log(data.currentPrice + " " + data._id + " " + data.currentUser);
	db.collection('auction', function(err, collection) {
		collection.findOne({'_id' : {$eq: o_id}}, function(err, item){
			if(item != null){
			console.log(item.currentPrice + " " + item.currentUser);
			if(item.currentPrice < data.currentPrice && item.userCreate != data.currentUser){
				collection.update({'_id' : {$eq: o_id}}, {$set:{'currentPrice' : data.currentPrice, 'currentUser' : data.currentUser}}, function(err, result){
				res.sendStatus(200);
				});
			}else{
				res.sendStatus(400);
			}
			}else{
				res.sendStatus(400);
			}
		});
	});
	db.collection('logs', function(err, collection){
		collection.insert({'date': Date(), 'origin': req.connection.remoteAddress, 'destination': 'updatePrice', 'headers': req.headers, 'body': req.body}, function(err, result){
			if(err){
				console.log(err);
			}
		});
	});
}


/*
 * Login function
 *
 *
 */
exports.logIn = function(req, res){

	var username = req.params.username;
	var user = req.body;
	console.log(user.username);
	
	db.collection('users', function(err, collection) {
		collection.findOne({'username': {$eq: user.username}}, function(err, item){
			if(item != null){
				console.log(user.password  + " " + item.password + " ");
				if(user.password===item.password){
						collection.update({'username': {$eq: user.username}}, {$set: {'status': 'online'}}, function(err, result){
							res.sendStatus(204);
						});
					}else{
						res.sendStatus(404);
					}
	
			}else{
				res.sendStatus(404);
			}
		});
	});

	db.collection('logs', function(err, collection){
		collection.insert({'date': Date(), 'origin': req.connection.remoteAddress, 'destination': 'login', 'headers': req.headers, 'body': req.body}, function(err, result){
			if(err){
				console.log(err);
			}
		});
	});
};





/*
 * allUsers
 *
 */
exports.allUsers = function(req, res){

	db.collection('users', function(err, collection){
		collection.find({},{'_id': 0, 'userId': 1, 'status': 1}).toArray(function(err, items){
			if(!err){
				var itemsJson = JSON.stringify(items);
				itemsJson = '{"users" : ' + itemsJson + '}';
				res.status(200).send(itemsJson);
			}else{
				res.sendStatus(409);
			}
		});
	});

	db.collection('logs', function(err, collection){
		collection.insert({'date': Date(), 'origin': req.connection.remoteAddress, 'destination': 'allUsers', 'headers': req.headers, 'body': req.body}, function(err, result){
			if(err){
				console.log(err);
			}
		});
	});
};




/*
* create auction
* check if everything is correct should be at client side
*/


exports.createAuction = function(req, res){
	var data = req.body;
	db.collection('auction', function(err, collection) {
		console.log(data.bookTitel + " " + data.userCreate);
	collection.insert({'bookTitle' : data.bookTitel, 'description' : data.description, 'minPrice' : data.minPrice, 'condition' : data.condition, 'date' : data.date, 'userCreate' : data.userCreate, 'currentPrice' : '0', 'currentUser' : 'noUser'}, {safe:true}, function(err, result){
			if(err){
				res.sendStatus(409);
			}else{
				res.sendStatus(201);
			}
		});
	});
	
};

    

	
	

/*
 * get all auctions
 *
 */
exports.getAllAuctions = function(req, res){
	db.collection('auction', function(err, collection){
		collection.find({},{'_id': 1, 'bookTitle': 1, 'description': 1, 'minPrice': 1, 'condition': 1, 'date': 1, 'userCreate': 1, 'currentPrice' : 1, 'currentUser': 1 }).toArray(function(err, items){
			var itemsJson = JSON.stringify(items);
			itemsJson = '{"auctions" : ' + itemsJson + '}';
			res.status(200).send(itemsJson)
		});
	});

	db.collection('logs', function(err, collection){
		collection.insert({'date': Date(), 'origin': req.connection.remoteAddress, 'destination': 'getAllMatches', 'headers': req.headers, 'body': req.body}, function(err, result){
			if(err){
				console.log(err);
			}
		});
	});
};

 /*
 * removes the auction from the completed collection (seller received the money)
 *
 */
 

exports.bookSold = function (req, res){
	var data = req.params.soldid;
	console.log(data);
	var mongo = require('mongodb');
	var o_id = new mongo.ObjectId(data._id);
	db.collection('completed', function(err, collection){
		collection.remove({'_id': o_id}, function(err, result){
								if(err){
									console.log("error with removing");
									res.sendStatus(409)
								}else{
									console.log("removed");
									res.sendStatus(201)
								}
								});
	});
	
	
};




/*
* get all completed auctions where the given user is the seller
*
*/


exports.getSoldBooks = function(req, res){
	var data = req.params.book;

	db.collection('completed', function(err, collection){
		collection.find({'userCreate': {$eq: data}}).toArray(function(err, item){
			if(item != null){
				var itemsJson = JSON.stringify(item);
				res.status(200).send(itemsJson)
			}else{
				res.sendStatus(404);
			}
		});
	});

	db.collection('logs', function(err, collection){
		collection.insert({'date': Date(), 'origin': req.connection.remoteAddress, 'destination': 'getMatchById', 'headers': req.headers, 'body': req.body}, function(err, result){
			if(err){
				console.log(err);
			}
		});
	});
};


/*
* get all completed auctions where the given user is the customer
*
*/


exports.getBoughtBooks = function(req, res){
	var data = req.params.book;

	db.collection('completed', function(err, collection){
		collection.find({'currentUser': {$eq: data}}).toArray(function(err, item){
			if(item != null){
				var itemsJson = JSON.stringify(item);
				res.status(200).send(itemsJson)
			}else{
				res.sendStatus(404);
			}
		});
	});

	db.collection('logs', function(err, collection){
		collection.insert({'date': Date(), 'origin': req.connection.remoteAddress, 'destination': 'getMatchById', 'headers': req.headers, 'body': req.body}, function(err, result){
			if(err){
				console.log(err);
			}
		});
	});
};

/*
* returns a given user
*/

exports.getUser = function(req, res){
	var data = req.params.userName;
	console.log(data);
	db.collection('users', function(err, collection){
		collection.findOne({'username': {$eq: data}},{'_id': 0, 'password' : 0} ,function(err, item){
			if(item != null){
				var itemsJson = JSON.stringify(item);
				res.status(200).send(itemsJson)
			}else{
				res.sendStatus(404);
			}
		});
	});

	db.collection('logs', function(err, collection){
		collection.insert({'date': Date(), 'origin': req.connection.remoteAddress, 'destination': 'getMatchById', 'headers': req.headers, 'body': req.body}, function(err, result){
			if(err){
				console.log(err);
			}
		});
	});
};





