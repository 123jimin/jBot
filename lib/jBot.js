var events = require('events'),
	util = require('util');
var irc = require('irc');

(function(){
"use strict";

var clearRequireCache = function clearRequireCache(){
	for(var f in require.cache) delete require.cache[f];
};

var padZero = function padZero(s, l){
	for(s+=''; s.length<l; s='0'+s); return s;
};

var jBot = function jBot(config){
	var bot=this, client;
	
	bot.birthday = Date.now();
	bot.config = config;
	bot.plugins = [];

	bot.log(config.nick+" initializing...");
	bot.setMaxListeners(0);

	// Connect to the server
	bot.client = client = new irc.Client(
		config.address, config.nick,
		config.connection
	);

	client.on('registered', function(msg){
		bot.log("Connected to "+config.address);
	});
};

util.inherits(jBot, events.EventEmitter);

jBot.prototype.birthday = Date.now();
jBot.prototype.config = null;
jBot.prototype.client = null;
jBot.prototype.plugins = null;

jBot.prototype.debug = function jBot$debug(str){
	if(this.config && this.config.debugMode)
		this.log("[debug] "+str);
};

jBot.prototype.log = function jBot$log(str){
	var d = new Date();
	console.log("%s/%s/%s %s:%s:%s | %s",
		d.getFullYear(),
		padZero(d.getMonth()+1, 2),
		padZero(d.getDate(), 2),
		padZero(d.getHours(), 2),
		padZero(d.getMinutes(), 2),
		padZero(d.getSeconds(), 2),
		str
	);
};

jBot.prototype.format = function jBot$format(s){

};

jBot.prototype.loadPlugin = function jBot$loadPlugin(file){
	if(this.plugins.indexOf(file) >= 0) return;

	var plugin = require(file);
	this.plugins.push(file);
	if((typeof plugin.init) === 'function')
		plugin.init(this);
};

module.exports = jBot;

})();
