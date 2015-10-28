function CommandPlugin(){}

CommandPlugin.prototype.bot = null;

CommandPlugin.prototype.init = function CommandPlugin$init(bot){
	var self_helptext = "@ <명령어>: 해당 명령어에 대한 도움말을 표시합니다.",
		self_commands = "?/도움/도움말".split('/');
	this.bot = bot;

	bot.addCommand('help', self_commands, self_helptext, function(msg, ctx, cmd, args){
		// warning: `msg` may be null
		if(args[0] && (self_commands.indexOf(args[0].toLowerCase()) >= 0 || args[0].toLowerCase() == 'help')){
			bot.replyFormat(ctx, "[도움말] %1%2: 대체 무슨 설명을 기대한 거냐...", bot.config.commandPrefix['public'][0], args[0]);
			return;
		}
		var find_cmd_orig = args[0] || cmd,
			find_cmd = find_cmd_orig.toLowerCase();
		if(!(find_cmd in bot.commands) || !('help' in bot.commands[find_cmd])){
			bot.replyFormat(ctx, "'%1' 명령에 대한 도움말을 찾을 수 없습니다!", find_cmd_orig);
			return;
		}

		var cmd_help = bot.commands[find_cmd].help;
		bot.replyWithoutEscaping(ctx, cmd_help.split('\n').map(function(line){
			if(line[0] == '@') return bot.format(ctx, "[도움말] %1%2" + line.slice(1), bot.config.commandPrefix['public'][0], find_cmd_orig);
			return bot.escapeNick("[도움말] " + line);
		}).join('\n'));
	});

	bot.addCommand('cmd', "명령/cmds/commands/명령어/명령목록/명령어목록/commandlist/commandslist".split('/'),
		"@: 이 봇에서 사용 가능한 명령어들의 목록을 표시합니다.", function(msg, ctx, cmd, args){
		bot.replyFormat(ctx, "명령 이름 앞에 %1를 붙이면 모두에게, %2를 붙이면 자신에게만 보이게 메세지를 보내줍니다. 각 명령에 대한 도움말은 ;help <명령이름> 으로 확인할 수 있습니다.",
			bot.config.commandPrefix['public'][0],
			bot.config.commandPrefix['private'][0]);
		bot.reply(ctx, bot.commandList.filter(function(cmd){return !bot.commands[cmd].hidden;}).join(', '));
	});

	bot.addListener('help', this.helpListener.bind(this));
};

CommandPlugin.prototype.helpListener = function CommandPlugin$helpListener(ctx, cmd){
	this.bot.emitCommand(null, ctx, 'help', [cmd]);
};

CommandPlugin.prototype.destroy = function CommandPlugin$destroy(){
	this.bot.removeAllListeners('help');
};

module.exports = new CommandPlugin;
