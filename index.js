'use strict';

const fs = require('fs');
const path = require('path');
const birdAuth = require('bird-auth');
const fsPath = require('fs-path');
const httpProxy = require('./libs/proxy');

const CONSOLE_COLOR_YELLOW = '\x1b[34m%s\x1b[0m';
const CONSOLE_COLOR_GREEN = '\x1b[33m%s\x1b[0m';

const Uuaper = function (params) {
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
        server: params.server,
        limit: params.limit
    };

    if (params.auth) {
        if (params.debug) {
            console.log(CONSOLE_COLOR_YELLOW, '===== Auto Get Cookies Mode =====\n');
        }
        this.onlyProxy = false;
        this.getCookie();
    } else {
        this.onlyProxy = true;
    }

    const self = this;
    if (params.server) {
        const express = require('express');
        const app = this.app = express();

        app.use(function (req, res, next) {
            const exec_start_at = Date.now();
            const _send = res.send;
            res.send = function () {
                res.set('X-Execution-Time', String(Date.now() - exec_start_at));
                return _send.apply(res, arguments);
            };
            next();
        });

        for (let i = 0; i < params.server.proxyPath.length; i++) {
            app.use(params.server.proxyPath[i], function (req, res) {
                self.proxyData(req, res);
            });
        }

        app.use(express.static(params.server.staticPath || __dirname));

        app.listen(params.server.port || 1337, function () {
            console.log('Server listening on http://localhost:' + params.server.port + ', Ctrl+C to stop')
        });
        return this;
    } else {
        return function (req, res, next) {
            self._options.mock ? self.mockData(req, res, next) : self.proxyData(req, res, next);
        }
    }
};

Uuaper.client = birdAuth.client;

function dealCookie(options, cookie, cb) {
    Uuaper.client.clear_cookies();

    if (options.auth.forwardCookie) {
        Uuaper.client.set_cookies(cookie);

        options.auth.forwardCookie(function (newCookie) {
            if (!newCookie) {
                throw new Error('where you new auth cookies ?');
            }
            options.cookie = newCookie;
            if (options.debug) {
                console.log(CONSOLE_COLOR_GREEN, 'New Cookie: =======> ', options.cookie);
            }
            cb && cb();
        });
    } else {
        options.cookie = cookie;
        if (options.debug) {
            console.log(CONSOLE_COLOR_GREEN, 'Cookie: =======> ', options.cookie);
        }
        cb && cb();
    }
}

Uuaper.prototype.getCookie = function (cb) {
    const self = this;
    if (self._options.auth.getAuth) {
        self._options.auth.getAuth(function (cookie) {
            if (!cookie) {
                throw new Error('where you auth cookies ?');
            }
            dealCookie(self._options, cookie, cb);
        });
    } else {
        new birdAuth[self._options.auth.type || 'uuap'](self._options.auth, function (cookie) {
            dealCookie(self._options, cookie, cb);
        });
    }
};

Uuaper.prototype.retry = function (req, res, body) {
    const self = this;
    this.getCookie(function () {
        const options = self._options;
        if (!res.headersSent) {
            req.headers.cookie = options.cookie;
        }
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
    const self = this;
    const options = self._options;
    const tmp = req.originalUrl.match(/\?/i) ? req.originalUrl.match(/(.+)\?{1}/i)[1] : req.originalUrl;

    if (options.debug) {
        console.log(CONSOLE_COLOR_GREEN, req.originalUrl + ' > ' + options.target + req.originalUrl);
    }

    req.headers.cookie = options.cookie || '';
    if (options.headers) {
        for (let item in options.headers) {
            req.headers[item] = options.headers[item];
        }
    }
    httpProxy(options.target, {
        limit: options.limit || '10mb',
        headers: options.headers,
        forwardPath: function (req) {
            return req.originalUrl;
        },
        intercept: function (resp, data, req, res, body, callback) {
            if (!options.onlyProxy) {
                if ((options.auth && options.auth.retry && options.auth.retry(resp, data && data.toString()))) {
                    self.retry(req, res, body);
                    return;
                }
                if (resp.headers['content-type']
                    && resp.headers['content-type'].match(/(text\/html|application\/json)/g)) {
                    const data = data.toString();
                    if (!data) {
                        options.auth && self.retry(req, res, body);
                        return;
                    }
                    if (options.cache && resp.headers['content-type'].match(/json/g)) {
                        const filePath = path.join(options.cache, tmp + '.json');
                        fs.exists(filePath, function (isExist) { // TODO remove deprecated api
                            if (!isExist) {
                                fsPath.writeFile(filePath, data, function (error) { // TODO why fsPath??
                                    if (error) {
                                        console.error(error);
                                    }
                                });
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
    const options = this._options;
    const tmp = req.originalUrl.match(/\?/i)
        ? req.originalUrl.match(/(.+)\?{1}/i)[1]
        : req.originalUrl;
    const filePath = path.join(options.cache, tmp + '.json');
    const self = this;
    fs.exists(filePath, function (isExist) {
        if (isExist) {
            fs.readFile(filePath, 'utf-8', function (err, data) {
                if (options.debug) {
                    console.log(CONSOLE_COLOR_YELLOW, tmp + ' > ' + filePath);
                }
                res.set('X-Uuaper-Type', 'mock');
                res.send(data);
            });
        } else {
            self.proxyData(req, res, next);
        }
    });
};

module.exports = Uuaper;
