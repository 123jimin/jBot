function PingPlugin(){}

PingPlugin.prototype.bot = null;

PingPlugin.prototype.init = function PingPlugin$init(bot){
	this.bot = bot;

	bot.addCommand('ping', "핑/pda/vld".split('/'),
		"@: 사용자에게 퐁을 때려줍니다.", function(msg, ctx, cmd, args){
		bot.reply(ctx, msg.nick+", pong!");
	});
};

PingPlugin.prototype.destroy = function PingPlugin$destroy(){
};

module.exports = new PingPlugin;
