'use strict';

var fs = require('fs');
var url = require('url');

var request = require('superagent');
var express = require('express');
var bodyParser = require('body-parser');
var birdAuth = require('bird-auth');
var fsPath = require('fs-path');

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

var options = {};

var Uuaper = module.exports = function (params) {
    options = {
        username: params.username,
        password: params.password,
        uuapServer: params.uuapServer,
        service: params.service,
        debug: params.debug ? params.debug : false,
        mock: params.mock ? params.mock : false,
        mockDir: params.mockDir
    }

    // 某些项目比较奇葩
    if (!params.server) {
        var tmp  = url.parse(decodeURIComponent(params.service))
        options.server = tmp.protocol + '//' + tmp.hostname + (~~tmp.port ? ':' + tmp.port : '');
    }
    else {
        options.server = params.server;
    }

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

    if (options.mock) {
        mockData(req, res)
        return
    }

    if (options.debug) console.log(req.originalUrl + ' > ' + options.server + req.originalUrl)

    request(req.method, options.server + req.originalUrl)
        .set({Cookie: options.cookie})
        .send(req.body)
        .end(function(err, resp) {
            if (err) {
                res.send({error: 'uuaper error'});
            }
            else if (resp && (resp.req.path.match('login') || resp.text == '')) {
                getCookie(function() {
                    request(req.method, options.server + req.baseUrl + req.url)
                        .set({Cookie: options.cookie})
                        .send(req.body)
                        .end(function(err, resp) {
                            res.send(resp.text);
                            if (options.mockDir) {
                                fs.exists(options.mockDir + req.originalUrl + '.json', function (isExist) {
                                    if (!isExist) {
                                        var tmp = req.originalUrl.match(/\?/i) ? req.originalUrl.match(/(.+)\?{1}/i)[1] : req.originalUrl;
                                        fsPath.writeFile(options.mockDir + tmp + '.json', resp.text);
                                    }
                                });
                            }
                        })
                })
            }
            else {
                res.send(resp.text);
                if (options.mockDir) {
                    fs.exists(options.mockDir + req.originalUrl + '.json', function (isExist) {
                        if (!isExist) {
                            var tmp = req.originalUrl.match(/\?/i) ? req.originalUrl.match(/(.+)\?{1}/i)[1] : req.originalUrl;
                            fsPath.writeFile(options.mockDir + tmp + '.json', resp.text);
                        }
                    });
                }
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

function mockData(req, res) {
    var tmp = req.originalUrl.match(/\?/i) ? req.originalUrl.match(/(.+)\?{1}/i)[1] : req.originalUrl;
    if (options.debug) console.log(req.originalUrl + ' > ' + options.mockDir + tmp + '.json')
    fs.exists(options.mockDir + tmp + '.json', function (isExist) {
        if (isExist) {
            fs.readFile(options.mockDir + tmp + '.json', 'utf-8', function (err, data) {
                res.send(data);
            });
        }
        else {
            res.send({error: 'uuaper error', message: "can't find file"});
        }
    });
}