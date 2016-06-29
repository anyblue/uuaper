'use strict';

var fs = require('fs');
var url = require('url');

var request = require('superagent');
var express = require('express');
var bodyParser = require('body-parser');
var birdAuth = require('bird-auth');

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

var options = {};

var Uuaper = module.exports = function (params) {
    options.username = params.username;
    options.password = params.password;
    options.uuapServer = params.uuapServer;
    options.service = params.service;
    options.server = params.server;

    fs.exists('./cookie.data', function (isExist) {
        if (isExist) {
            fs.readFile('./cookie.data', 'utf-8', function (err, data) {
                options.cookie = data;
            });
        }
        else {
            getCookie();
        }
    });
};

Uuaper.prototype.loadData = function (req, res) {
    // console.log(options.server + req.baseUrl + req.url)
    request(req.method, options.server + req.baseUrl + req.url)
        .set({Cookie: options.cookie})
        .send(req.body)
        .end(function(err, resp) {
            if (err) {
                res.send('error');
            }
            else if (resp && (resp.req.path.match('login') || resp.text == '')) {
                getCookie(function() {
                    request(req.method, options.server + req.baseUrl + req.url)
                        .set({Cookie: options.cookie})
                        .send(req.body)
                        .end(function(err, resp) {
                            res.send(resp.text);
                        })
                })
            }
            else {
                res.send(resp.text);
            }
        })
};

Uuaper.prototype.startServer = function (params) {

    options.port = params.port || 1337;
    options.staticPath = params.staticPath || __dirname;
    options.proxyPath = params.proxyPath || [];

    for (var i = 0; i < options.proxyPath.length; i++) {
        app.use(options.proxyPath[i], this.loadData);
    }

    app.use(express.static(options.staticPath));

    app.listen(options.port, function () {
        console.log('Server listening on http://localhost:'+options.port+', Ctrl+C to stop')
    });
};

function getCookie(cb) {
    var uuap = new birdAuth.uuap({
        username: options.username,
        password: options.password,
        uuapServer: options.uuapServer,
        service: options.service
    }, function(cookie) {
        options.cookie = cookie;
        cb && cb();
        fs.writeFile('./cookie.data', cookie);
    });
};