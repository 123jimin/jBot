var events = require('events'),
	fs = require('fs'),
	path = require('path'),
	path_isAbsolute = require('path-is-absolute'),
	util = require('util');
var irc = require('irc'),
	sqlite3 = require('sqlite3');

(function(){
"use strict";

var getAbsolutePath = function getAbsolutePath(file){
	return path_isAbsolute(file) ? file : path.join(process.cwd(), file);
};

var clearRequireCache = function clearRequireCache(){
	for(var f in require.cache) delete require.cache[f];
};

var padZero = function padZero(s, l){
	for(s+=''; s.length<l; s='0'+s); return s;
};

var escapeRegEx = function escapeRegEx(str){
	return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
};

var jBot = function jBot(config){
	var bot=this, client;
	
	bot.birthday = Date.now();
	bot.config = config;
	bot.commands = {};
	bot.commandList = [];
	bot.plugins = [];
	bot.pluginFiles = [];

	bot.connected = false;

	bot.log(config.nick+" initializing...");
	bot.setMaxListeners(0);
	
	var db_promise;
	if(bot.config.database == null){
		db_promise = Promise.resolve(null);
	}else{
		db_promise = new Promise(function(resolve, reject){
			bot.db = new sqlite3.Database(getAbsolutePath(bot.config.database));
			
			// There might be more than a single error...
			bot.db.on('error', function(err){
				bot.logError(err);
				// Do not reject it.
			});
			
			bot.db.on('open', function(){
				bot.log("The SQLite database is opened.");
				resolve();
			});
		});
	}
	
	db_promise.then(function(){
		// Connect to the server
		bot.client = client = new irc.Client(
			config.address, config.nick,
			config.connection
		);

		client.setMaxListeners(0);
		
		// Load plugins
		if(config.pluginDirectory){
			bot.log("Loading plugins...");
			bot.loadPlugins(config.pluginDirectory);
			bot.log("Loaded "+bot.plugins.length+" plugin"+(bot.plugins.length>1?'s':'')+".");
		}

		client.on('registered', function jBot$registered(msg){
			bot.connected = true;
			bot.log("Connected to "+config.address);
		});

		client.on('error', function jBot$error(msg){
			bot.log("[IRC error] "+msg.command+" "+msg.args.join(" "));
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
	}).catch(function(err){
		bot.logError(err);
	});
};

util.inherits(jBot, events.EventEmitter);

jBot.prototype.birthday = Date.now();
jBot.prototype.config = null;
jBot.prototype.client = null;
jBot.prototype.plugins = null;
jBot.prototype.pluginFiles = null;
jBot.prototype.commands = null;
jBot.prototype.commandList = null;
jBot.prototype.db = null;
jBot.prototype.connected = false;

jBot.prototype.debug = function jBot$debug(str){
	if(this.config && this.config.debugMode)
		this.log("[debug] "+str);
};

jBot.prototype.logError = function jBot$logError(err){
	if(!(err instanceof Error)){
		this.log("[error] "+err);
	}else if((typeof err.stack) === 'string'){
		var stack = err.stack.split('\n');
		this.log("[error] "+stack.shift());
		stack.forEach(function(line){
			this.debug("[stack] "+line.trim());
		}, this);
	}
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

jBot.prototype.escapeNick = function(chan, s){
	var escape_char = this.config.nickEscaper;
	var _escape = function(match){
		if(!match) return '';
		return match[0] + escape_char + match.slice(1);
	};

	if((typeof chan) == 'string'){
		if(chan[0] == '#'){
			if(!(chan in this.client.chans)) return s;
			var regex_users = Object.keys(this.client.chans[chan].users).map(escapeRegEx).join('|');
			return s.replace(new RegExp(regex_users, 'ig'), _escape);
		}else{
			return s.replace(new RegExp(escapeRegEx(chan), 'ig'), _escape);
		}
	}else{
		return s;
	}
};

jBot.prototype.format = function jBot$format(ctx, str){
	var args=[null], i;
	for(i=2; i<arguments.length; i++) args.push(arguments[i]);
	return this.escapeNick(ctx[0], str.replace(/\%(?:([a-z0-9\/]+|\%)|\{([a-z0-9\/]*)\})/ig, function(s, a, b){
		var x = a || b;
		if(typeof x != 'string') return s;
		if(x == 0|x) return args[x] || '';
		switch(x.toLowerCase()){
			case 'b': case "bold": return "\x02";
			case '/b': case "/bold": return '\x0F';
			case '%': return '%';
			default: return s;
		}
	}));
};

jBot.prototype.replyFormat = function jBot$replyFormat(ctx, s){
	this.replyWithoutEscaping(ctx, this.format.apply(this, arguments));
};

jBot.prototype.reply = function jBot$reply(ctx, s){
	this.replyWithoutEscaping(ctx, this.escapeNick(ctx[0], s));
};

jBot.prototype.addCommand = function jBot$addCommand(cmd, alts, help, func, hidden){
	var bot = this;
	if((typeof func) !== 'function')
		throw new Error("Handler for ["+cmd+"] command is not a function!");
	var cmdObj = {
		'name': cmd,
		'help': help || "@: ???",
		'alts': alts,
		'func': function _cmd_wrap(){
			try{
				func.apply(this, arguments);
			}catch(e){
				bot.logError(e);
			}
		},
		'hidden': !!hidden
	};
	this.commands[cmd.toLowerCase()] = cmdObj;
	this.commandList.push(cmd.toLowerCase());
	alts.forEach(function(cmd){
		this.commands[cmd.toLowerCase()] = cmdObj;
	}, this);
};

jBot.prototype.emitCommand = function jBot$emitCommand(msg, ctx, cmd, args){
	cmd = cmd.toLowerCase();
	if(!(cmd in this.commands)) return false;
	this.commands[cmd].func.call(this, msg, ctx, cmd, args);
	return true;
};

jBot.prototype.onReady = function jBot$onReady(f){
	if(this.connected) f();
	else this.client.on('registered', f);
};

jBot.prototype.replyWithoutEscaping = function jBot$replyWithoutEscaping(ctx, str){
	this.say(ctx[1], ctx[0], str);
};

jBot.prototype.say = function jBot$say(type, target, message){
	if((typeof message === 'string') && message.includes("\n")){
		s.split(/[\r\n]+/g).forEach(function(line){
			this.say(type, target, line);
		}, this);
		return;
	}

	type = type.toUpperCase();
	this.log("> "+target+" "+type+" > "+message);
	type == 'PRIVMSG' ? this.client.say(target, message) : this.client.notice(target, message);
};

jBot.prototype.quit = function jBot$quit(reason){
	var bot = this;
	bot.log("Disconnecting... ("+reason+")");
	bot.client.disconnect(reason, function(){
		// TODO: destroy plugins
		bot.log("Disconnected.");
	});
};

jBot.prototype.loadPlugin = function jBot$loadPlugin(file){
	if(this.pluginFiles.indexOf(file) >= 0) return;
	if(file.slice(-4) == '.log') return;
	
	file = getAbsolutePath(file);
	
	this.log("* Loading plugin '"+path.relative(process.cwd(), file)+"'...");
	
	var plugin = require(file);
	this.pluginFiles.push(file);
	this.plugins.push(plugin);

	if((typeof plugin.init) === 'function')
		plugin.init(this);
	
};

jBot.prototype.loadPlugins = function jBot$loadPlugins(dir){
	fs.readdirSync(dir).forEach(function(plugin){
		if(plugin[0] != '.') this.loadPlugin(path.join(dir, plugin));
	}, this);
};

jBot.prototype.reloadPlugins = function jBot$reloadPlugins(){
	this.commands = {};
	this.commandList = [];
	this.plugins.forEach(function(plugin, ind){
		this.log("* Reloading plugin '"+path.relative(process.cwd(), file)+"'...");
		if((typeof plugin.destroy) === 'function')
			plugin.destroy();
		if((typeof plugin.init) === 'function')
			plugin.init(this);
	}, this);
};

module.exports = jBot;

})();
