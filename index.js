'use strict';

const fs = require('fs');
const path = require('path');
const birdAuth = require('bird-auth');
const httpProxy = require('./libs/proxy');

const CONSOLE_COLOR_BLUE = '\x1b[34m%s\x1b[0m';
const CONSOLE_COLOR_YELLOW = '\x1b[33m%s\x1b[0m';

const Uuaper = function (params) {
    if (!params) throw new Error('Where you params?');

    const {service, cache, target, debug, headers, mock, auth, server, limit} = params;
    if (service) {
        throw new Error('Uuaper 2.x version is not support 1.x settings, you can `npm install uuaper@1.3.4 --save`.');
    }

    if (cache && typeof cache !== 'string') {
        throw new Error('the cache setting must be a path string.');
    }

    this._options = {
        target,
        debug: debug || false,
        headers: headers || {},
        mock,
        cache,
        auth,
        server,
        limit
    };

    if (auth) {
        this.onlyProxy = false;
        if (debug) {
            console.log(CONSOLE_COLOR_BLUE, '===== Auto Get Cookies Mode =====\n');
        }
        this.getCookie();
    } else {
        this.onlyProxy = true;
    }

    const self = this;
    if (server) {
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

        server.proxyPath.forEach(item => {
            app.use(item, function (req, res) {
                self.proxyData(req, res);
            });
        });

        app.use(express.static(server.staticPath || __dirname));

        app.listen(server.port || 1337, function () {
            console.log('Server listening on http://localhost:' + server.port + ', Ctrl+C to stop')
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
                console.log(CONSOLE_COLOR_YELLOW, 'New Cookie: =======> ', options.cookie);
            }
            cb && cb();
        });
    } else {
        options.cookie = cookie;
        if (options.debug) {
            console.log(CONSOLE_COLOR_YELLOW, 'Cookie: =======> ', options.cookie);
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
    const {debug, target, cookie, headers, limit, onlyProxy, auth, cache} = self._options;
    const tmp = req.originalUrl.match(/\?/i) ? req.originalUrl.match(/(.+)\?{1}/i)[1] : req.originalUrl;

    if (debug) {
        console.log(CONSOLE_COLOR_YELLOW, req.originalUrl + ' > ' + target + req.originalUrl);
    }

    req.headers.cookie = cookie || '';
    if (headers) {
        for (let item in headers) {
            req.headers[item] = headers[item];
        }
    }
    httpProxy(target, {
        limit: limit || '10mb',
        headers,
        forwardPath: function (req) {
            return req.originalUrl;
        },
        intercept: function (resp, data, req, res, body, callback) {
            if (!onlyProxy) {
                if (auth && auth.retry && auth.retry(resp, data && data.toString())) {
                    self.retry(req, res, body);
                    return;
                }
                const pattern = /(text\/html|application\/json)/g;
                if (resp.headers['content-type'] && resp.headers['content-type'].match(pattern)) {
                    const localData = data.toString();
                    if (!localData) {
                        auth && self.retry(req, res, body);
                        return;
                    }
                    if (cache && resp.headers['content-type'].match(/json/g)) {
                        const filePath = path.join(cache, tmp, '.json');
                        if (!fs.existsSync(filePath)) {
                            fs.writeFile(filePath, localData, error => {
                                if (error) {
                                    console.error(error);
                                    return;
                                }
                            });
                        }
                    }
                }
            }
            callback(null, data);
        }
    })(req, res, next);
};

Uuaper.prototype.mockData = function (req, res, next) {
    const {cache, debug} = this._options;
    const tmp = req.originalUrl.match(/\?/i)
        ? req.originalUrl.match(/(.+)\?{1}/i)[1]
        : req.originalUrl;

    const filePath = path.join(cache, tmp, '.json');
    if (fs.existsSync(filePath)) {
        fs.readFile(filePath, 'utf-8', function (err, data) {
            if (debug) {
                console.log(CONSOLE_COLOR_BLUE, tmp + ' > ' + filePath);
            }
            res.set('X-Uuaper-Type', 'mock');
            res.send(data);
        });
    } else {
        this.proxyData(req, res, next);
    }
};

module.exports = Uuaper;
