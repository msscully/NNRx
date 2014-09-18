#!/usr/bin/env node

//this hook installs all your plugins

// add your plugins to this list--either the identifier, the filesystem location or the URL
var pluginlist = [
    "org.apache.cordova.device",
    "https://github.com/VitaliiBlagodir/cordova-plugin-datepicker",
    "de.appplant.cordova.plugin.hidden-statusbar-overlay",
    "https://github.com/msscully/cordova-plugin-local-notifications",
    "https://github.com/msscully/cordova-plugin-dialogs",
    "org.apache.cordova.splashscreen",
];

// no need to configure below

var fs = require('fs');
var path = require('path');
var sys = require('sys');
var exec = require('child_process').exec;

function puts(error, stdout, stderr) {
    sys.puts(stdout);
}

pluginlist.forEach(function(plug) {
    exec("cordova plugin add " + plug, puts);
});
