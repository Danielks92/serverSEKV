/* -----------------------------------------
 * ---- Bookechange Server - SE 2016/17 ----
 * ----------------------------------------- */

var express = require('express');
var bodyParser = require('body-parser');
var bookexchange = require('./routes/bookexchange');
var node_server = express();
var cors = require('cors');

node_server.use(cors());
node_server.use(bodyParser.json());
node_server.use(bodyParser.urlencoded({
	extended: true
}));

//interfaces for the clients
node_server.post('/auction', bookexchange.createAuction);
node_server.post('/auctionUpdate', bookexchange.updateCurrentPrice);
node_server.put('/users/logIn/:userId', bookexchange.logIn);
node_server.get('/auction/all', bookexchange.getAllAuctions);
node_server.get('/users', bookexchange.allUsers);
node_server.get('/users/getAll/:userName', bookexchange.getUser);
node_server.get('/completed/getSold/:book', bookexchange.getSoldBooks);
node_server.get('/completed/getBought/:book', bookexchange.getBoughtBooks);
node_server.delete('/completed/sold/:soldid', bookexchange.bookSold);



//server accessible on specified port
node_server.listen(1337);
console.log('Server lauscht auf Port 1337');







