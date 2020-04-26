#!/usr/bin/env node

var process = require('process')
var WebDHT = require('./src/WebDHT')

var opts = {
  port: parseInt(process.argv[2]),
  bootstrap: process.argv.slice(3)
}

if (isNaN(opts.port)) opts.port = 8000

WebDHT.start(opts)
