function AdminPlugin(){
	var self = this;
	process.on('SIGINT', function(){
		console.log("SIGINT received!");
		try{
			self.bot && self.bot.quit("Ctrl+C");
		}catch(e){}

		setTimeout(function(){
			process.exit(0);
		}, 200);
	});
}

AdminPlugin.prototype.admin = null;
AdminPlugin.prototype.bot = null;

AdminPlugin.prototype.init = function AdminPlugin$init(bot){
	var self = this;

	this.admin = null;
	this.bot = bot;

	var check = function check(nick){
		bot.client.whois(nick, function(obj){
			if(obj.account && obj.account == bot.config.owner){
				var listening = false;
				if(self.admin){
					listening = true;
				}
				self.admin = nick;
				bot.say('NOTICE', nick, "안녕하세요, 주인님!");
				if(!listening){
					bot.client.addListener('nick', self.nickListener.bind(self));
					bot.client.addListener('quit', self.quitListener.bind(self));
				}
			}
		});
	};

	bot.addCommand('admin', ["주인", "login", "로그인", "master"], null, function(msg, ctx, cmd, args){
		check(msg.nick);
	}, true);

	bot.addCommand('quit', "꺼져/ㄲㅈ/exit/halt/shutdown".split('/'), null, function(msg, ctx, cmd, args){
		bot.reply(ctx, "장비를 정지합니다. 정지하겠습니다.");
		if(self.admin === msg.nick){
			bot.quit(args.join(' '));
		}else{
			bot.reply(ctx, "안되잖아?");
			bot.say('NOTICE', msg.from, "...");
		}
	}, true);

	bot.addCommand('rawsay', ["rawmsg", "rmsg", "rsay", "raw말해"], null, function(msg, ctx, cmd, args){
		if(self.admin === msg.nick)
			bot.client.send.apply(bot.client, args);
	}, true);

	bot.addCommand('멍멍', ["왈왈", "깽깽", "컹컹"], null, function(msg, ctx, cmd, args){
		if(self.admin === msg.nick) bot.reply(ctx, cmd+"!");
		else bot.say('NOTICE', msg.nick, "즐");
	}, true);

	bot.onReady(function(){
		check(bot.config.owner);
	});
};

AdminPlugin.prototype.nickListener = function AdminPlugin$nickListener(old_nick, new_nick){
	if(!this.admin) return;
	if(this.admin === old_nick)
		this.admin = new_nick;
};

AdminPlugin.prototype.quitListener = function AdminPlugin$quitListener(nick){
	if(this.admin == nick)
		this.admin = null;
};

AdminPlugin.prototype.masterListener = function AdminPlugin$masterListener(msg){
	if(this.admin){
		this.bot.say('NOTICE', this.admin, msg);
	}
};

AdminPlugin.prototype.destroy = function AdminPlugin$destroy(){
	this.admin = null;
	this.bot.client.removeListener('nick', this.nickListener);
	this.bot.client.removeListener('quit', this.quitListener);
	this.bot.removeListener('master', this.masterListener);
};

module.exports = new AdminPlugin;
