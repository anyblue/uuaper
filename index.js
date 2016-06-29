'use strict';

var fs = require('fs');

var request = require('superagent');
var birdAuth = require('bird-auth');

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
    request(req.method, options.server + req.baseUrl + req.url)
        .set({Cookie: options.cookie})
        .send(req.body)
        .end(function(err, resp) {
            if (resp.req.path.match('login') || resp.text == '') {
                getCookie(function() {
                    request(req.method, options.server + req.baseUrl + req.url)
                        .set({Cookie: options.cookie})
                        .end(function(err, resp) {
                            res.send(resp)
                        })
                })
            }
            else {
                res.send(resp.text)
            }
        })
};

function getCookie(cb) {
    var uuap = new birdAuth.uuap({
        username: options.username,
        password: options.password,
        uuapServer: options.uuapServer, // CAS auth url 
        service: options.service // service address, if you don't know this url, you can logout you system, and get `service` parameters
    }, function(cookie) {
        options.cookie = cookie;
        cb && cb()
        fs.writeFile('./cookie.data', cookie);
    });
};