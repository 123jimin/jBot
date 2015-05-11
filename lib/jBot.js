var events = require('events'),
	fs = require('fs'),
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
	bot.commands = {};
	bot.plugins = [];

	bot.log(config.nick+" initializing...");
	bot.setMaxListeners(0);

	// Load plugins
	if(config.pluginDirectory){
		bot.log("Loading plugins...");
		bot.loadPlugins(config.pluginDirectory);
		bot.log(bot.plugins.length+" plugin"+(bot.plugins.length>1?'s':'')+" loaded.");
	}

	// Connect to the server
	bot.client = client = new irc.Client(
		config.address, config.nick,
		config.connection
	);

	client.on('registered', function jBot$registered(msg){
		bot.log("Connected to "+config.address);
	});

	client.on('message', function jBot$message(nick, to, text, msg){
		bot.log(to+" <"+nick+"> "+text);

		var prefix=null, i, p, ctx, args;
		
		// Public commands
		p = bot.config.commandPrefix['public'];
		for(i=0; i<p.length; i++){
			if(text.slice(0, p[i].length) == p[i]){
				prefix = p[i]; break;
			}
		}
		if(prefix != null){
			args = text.slice(prefix.length).split(' ');
			ctx = [to == client.nick ? nick : to, 'PRIVMSG'];
			bot.emitCommand(msg, ctx, args[0], args.slice(1));
			return;
		}
		
		// Private commands
		p = bot.config.commandPrefix['private'];
		for(i=0; i<p.length; i++){
			if(text.slice(0, p[i].length) == p[i]){
				prefix = p[i]; break;
			}
		}
		if(prefix != null){
			args = text.slice(prefix.length).split(' ');
			ctx = [nick, 'NOTICE'];
			bot.emitCommand(msg, ctx, args[0], args.slice(1));
			return;
		}
	});
};

util.inherits(jBot, events.EventEmitter);

jBot.prototype.birthday = Date.now();
jBot.prototype.config = null;
jBot.prototype.client = null;
jBot.prototype.plugins = null;
jBot.prototype.commands = null;

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
	// TODO: add argument processings
	// TODO: escape nicks
	return s;
};

jBot.prototype.addCommand = function jBot$addCommand(cmd, alts, help, func){
	var cmdObj = {
		'name': cmd,
		'help': help,
		'alts': alts,
		'func': func
	};
	this.commands[cmd.toLowerCase()] = cmdObj;
	alts.forEach(function(cmd){
		this.commands[cmd.toLowerCase()] = cmdObj;
	}, this);
};

jBot.prototype.emitCommand = function jBot$emitCommand(msg, ctx, cmd, args){
	cmd = cmd.toLowerCase();
	if(!(cmd in this.commands)) return false;
	this.commands[cmd].func(msg, ctx, cmd, args);
	return true;
};

jBot.prototype.reply = function jBot$reply(ctx, str){
	if(ctx[1] == 'PRIVMSG') this.client.say(ctx[0], str);
	else this.client.notice(ctx[0], str);
};

jBot.prototype.loadPlugin = function jBot$loadPlugin(file){
	if(this.plugins.indexOf(file) >= 0) return;

	this.log("* Loading plugin '"+file+"'...");
	
	if(file[0] != '/') file = process.cwd() + '/' + file;
	var plugin = require(file);
	this.plugins.push(file);
	if((typeof plugin.init) === 'function')
		plugin.init(this);
};

jBot.prototype.loadPlugins = function jBot$loadPlugins(dir){
	fs.readdirSync(dir).forEach(function(plugin){
		if(plugin[0] != '.') this.loadPlugin(dir + '/' + plugin);
	}, this);
};

module.exports = jBot;

})();
