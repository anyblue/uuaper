'use strict';

var fs = require('fs');
var url = require('url');
var path = require('path');

var birdAuth = require('bird-auth');
var fsPath = require('fs-path');

var httpProxy = require('./libs/proxy');

var CONSOLE_COLOR_YELLOW = '\x1b[34m%s\x1b[0m';
var CONSOLE_COLOR_GREEN = '\x1b[33m%s\x1b[0m';

var Uuaper = function (params) {

    if (!params) throw new Error('Where you params?');

    if (params.service) {
        throw new Error('Uuaper 2.x version is not support 1.x settings, you can `npm install uuaper@1.3.4 --save`.');
    }

    if (params.cache && typeof params.cache !== 'string') {
        throw new Error('the cache setting must be a path string.');
    }

    this._options = {
        target: params.target,
        debug: params.debug || false,
        headers: params.headers || {},
        mock: params.mock,
        cache: params.cache,
        auth: params.auth,
        server: params.server
    };

    if (params.auth) {
        if (params.debug) console.log(CONSOLE_COLOR_YELLOW, '===== Auto Get Cookies Mode =====\n');
        this.onlyProxy = false;
        this.getCookie();
    }
    else {
        this.onlyProxy = true;
    }

    var self = this;
    if (params.server) {
        var express = require('express');
        var app = this.app = express();

        app.use(function (req, res, next) {
            var exec_start_at = Date.now();
            var _send = res.send;
            res.send = function () {
                res.set('X-Execution-Time', String(Date.now() - exec_start_at));
                return _send.apply(res, arguments);
            };
            next();
        });

        for (var i = 0; i < params.server.proxyPath.length; i++) {
            app.use(params.server.proxyPath[i], function (req, res) {
                self.proxyData(req, res);
            });
        }

        app.use(express.static(params.server.staticPath || __dirname));

        app.listen(params.server.port || 1337, function () {
            console.log('Server listening on http://localhost:' + params.server.port + ', Ctrl+C to stop')
        });
        return this;
    }
    else {
        return function (req, res, next) {
            self._options.mock ? self.mockData(req, res, next) : self.proxyData(req, res, next);
        }
    }
};

Uuaper.prototype.getCookie = function (cb) {
    var self = this;
    var uuap = new birdAuth.uuap(self._options.auth, function (cookie) {
        self._options.cookie = cookie;
        cb && cb();
    });
    return uuap;
};

Uuaper.prototype.retry = function (req, res, body) {
    var self = this;
    this.getCookie(function () {
        var options = self._options;
        req.headers.cookie = options.cookie;
        res.set('X-Uuaper-Retry', true);
        httpProxy(options.target, {
            forwardPath: function (req) {
                return req.originalUrl;
            },
            defaultBody: body
        })(req, res, function (e) {
            console.log(e);
        });
    })
};

Uuaper.prototype.proxyData = function (req, res, next) {
    var self = this;
    var options = self._options;
    var tmp = req.originalUrl.match(/\?/i) ? req.originalUrl.match(/(.+)\?{1}/i)[1] : req.originalUrl;

    if (options.debug) {
        console.log(CONSOLE_COLOR_GREEN, req.originalUrl + ' > ' + options.target + req.originalUrl);
    }
    req.headers.cookie = options.cookie || '';
    if (options.headers) {
        for (var item in options.headers) {
            req.headers.item = options.headers[item];
        }
    }
    httpProxy(options.target, {
        headers: options.headers,
        forwardPath: function (req) {
            return req.originalUrl;
        },
        intercept: function (resp, data, req, res, body, callback) {
            if (!options.onlyProxy) {
                if (+resp.statusCode === 302
                    || (options.auth.retry && options.auth.retry(resp, data && data.toString()))) {
                    self.retry(req, res, body);
                    return;
                }
                if (resp.headers['content-type']
                    && resp.headers['content-type'].match(/(text\/html|application\/json)/g)) {
                    var data = data.toString();
                    if (!data) {
                        self.retry(req, res, body);
                        return;
                    }
                    if (options.cache && resp.headers['content-type'].match(/json/g)) {
                        var filePath = path.join(options.cache, tmp + '.json');
                        fs.exists(filePath, function (isExist) {
                            if (!isExist) {
                                fsPath.writeFile(filePath, data);
                            }
                        });
                    }
                }
            }
            callback(null, data);
        }
    })(req, res, next);
};

Uuaper.prototype.mockData = function (req, res, next) {
    var options = this._options;
    var tmp = req.originalUrl.match(/\?/i)
        ? req.originalUrl.match(/(.+)\?{1}/i)[1]
        : req.originalUrl;
    var filePath = path.join(options.cache, tmp + '.json');
    var self = this;
    fs.exists(filePath, function (isExist) {
        if (isExist) {
            fs.readFile(filePath, 'utf-8', function (err, data) {
                if (options.debug) {
                    console.log(CONSOLE_COLOR_YELLOW, tmp + ' > ' + filePath);
                }
                res.set('X-Uuaper-Type', 'mock');
                res.send(data);
            });
        }
        else {
            self.proxyData(req, res, next);
        }
    });
};

module.exports = Uuaper;