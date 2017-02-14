'use strict';

var fs = require('fs');
var url = require('url');

var birdAuth = require('bird-auth');
var fsPath = require('fs-path');

var httpProxy = require('./libs/proxy');

var options = {};

var Uuaper = module.exports = function (params) {

    options = {
        service: params.service.match(/%3A%2F%2F/ig) ? params.service : encodeURIComponent(params.service),
        debug: params.debug || false,
        mock: params.mock || false,
        mockDir: params.mockDir,
        mockCache: params.mockCache || false,
        headers: params.headers || {}
    }

    // 某些项目比较奇葩
    if (!params.server) {
        var tmp  = url.parse(decodeURIComponent(params.service));
        options.server = tmp.protocol + '//' + tmp.hostname + (~~tmp.port ? ':' + tmp.port : '');
    }
    else {
        options.server = params.server;
    }

    // console.log(options)
    if (params.cookie) {
        if (options.debug) {
            console.log('===== Custom Cookies Mode =====');
        }
        options.onlyProxy = true;
        options.cookie = params.cookie;
    }
    else {
        options.username = params.username;
        options.password = params.password;
        options.uuapServer = params.uuapServer;
        if (!options.username || !options.password || !options.uuapServer) {
            options.onlyProxy = true;
        }
        else {
            if (options.debug) {
                console.log('===== Auto Get Cookies Mode =====');
            }
            _getCookie();
        }
    }
};

Uuaper.prototype.loadData = function (req, res) {
    options.mock ? _mockData(req, res) : _proxyData(req, res);
};


Uuaper.prototype.startServer = function (params) {
    var express = require('express');
    var app = express();

    app.use(function (req, res, next) {
        var exec_start_at = Date.now();
        var _send = res.send;
        res.send = function () {
            res.set('X-Execution-Time', String(Date.now() - exec_start_at));
            return _send.apply(res, arguments);
        };
        next();
    });

    options.port = params.port || 1337;
    options.staticPath = params.staticPath || __dirname;
    options.proxyPath = params.proxyPath || [];

    for (var i = 0; i < options.proxyPath.length; i++) {
        app.use(options.proxyPath[i], this.loadData);
    }

    app.use(express.static(options.staticPath));

    app.listen(options.port, function () {
        console.log('Server listening on http://localhost:' + options.port + ', Ctrl+C to stop')
    });
};

function _getCookie(cb) {
    var uuap = new birdAuth.uuap({
        username: options.username,
        password: options.password,
        uuapServer: options.uuapServer,
        service: options.service
    }, function(cookie) {
        options.cookie = cookie;
        cb && cb();
    });
};

function retry(req, res, body) {
    _getCookie(function (cookie) {
        req.headers.cookie = options.cookie;
        httpProxy(options.server, {
            forwardPath: function(req) {
                return req.originalUrl;
            },
            defaultBody: body
        })(req, res, function(e) {
            console.log(e)
        });
    })
}

function _proxyData(req, res) {
    var tmp = req.originalUrl.match(/\?/i) ? req.originalUrl.match(/(.+)\?{1}/i)[1] : req.originalUrl;
    
    if (options.debug) console.log(req.originalUrl + ' > ' + options.server + req.originalUrl);

    req.headers.cookie = options.cookie || '';
    httpProxy(options.server, {
        forwardPath: function(req) {
            return req.originalUrl;
        },
        intercept: function(resp, data, req, res, body, callback) {
            if (!options.onlyProxy) {
                if (+resp.statusCode === 302) {
                    retry(req, res, body);
                    return;
                }
                // if ((!resp.headers['content-type'] || !resp.headers['content-type'].match('stream'))
                //         && !req.originalUrl.match(/[\w]+[\.](avi|mpeg|3gp|mp3|mp4|wav|jpeg|gif|jpg|png|apk|exe|txt|html|zip|Java|doc|js|json|css|ttf|woff|csv|doc|xlsx|rar|7z)/g)){
                //     var data = data.toString();
                //     if (!data) {
                //         retry(req, res, body);
                //         return;
                //     }
                //     if (options.mockCache || options.mockDir) {
                //         fs.exists(options.mockDir + tmp + '.json', function (isExist) {
                //             if (!isExist) {
                //                 fsPath.writeFile(options.mockDir + tmp + '.json', data);
                //             }
                //         });
                //     }
                // }
                if (resp.headers['content-type'] && resp.headers['content-type'].match(/(text\/html|application\/json)/g)) {
                    var data = data.toString();
                    if (!data) {
                        retry(req, res, body);
                        return;
                    }
                    if (options.mockCache || options.mockDir) {
                        fs.exists(options.mockDir + tmp + '.json', function (isExist) {
                            if (!isExist) {
                                fsPath.writeFile(options.mockDir + tmp + '.json', data);
                            }
                        });
                    }
                }
            }
            callback(null, data);
        }
    })(req, res, function(e) {
        console.log(e)
    });
}


function _mockData(req, res) {
    var tmp = req.originalUrl.match(/\?/i) ? req.originalUrl.match(/(.+)\?{1}/i)[1] : req.originalUrl;
    fs.exists(options.mockDir + tmp + '.json', function (isExist) {
        if (isExist) {
            fs.readFile(options.mockDir + tmp + '.json', 'utf-8', function (err, data) {
                if (options.debug) console.log(tmp + ' > ' + options.mockDir + tmp + '.json')
                res.send(data);
            });
        }
        else {
            _proxyData(req, res);
        }
    });
}