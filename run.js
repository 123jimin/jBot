#!/usr/bin/env node

var JBot = require("./lib/jBot.js");

var jBot = new JBot(JSON.parse(require('strip-json-comments')(require('fs').readFileSync("./config.json", 'utf-8'))));
