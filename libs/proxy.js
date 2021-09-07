'use strict';

const http = require('http');
const https = require('https');
const getRawBody = require('raw-body');
const {URL} = require('url');

module.exports = function (host, options) {
    options = options || {};

    let parsedHost;

    const body = options.defaultBody;
    const intercept = options.intercept;
    const limit = options.limit || '10mb';
    const filter = options.filter || defaultFilter;
    const forwardPath = options.forwardPath || defaultForwardPath;
    const forwardPathAsync = options.forwardPathAsync || defaultForwardPathAsync(forwardPath);

    return function handleProxy(req, res, next) {
        if (!filter(req, res)) {
            return next();
        }
        forwardPathAsync(req, res)
            .then(function (path) {
                proxyWithResolvedPath(req, res, next, path);
            })
    };

    function proxyWithResolvedPath(req, res, next, path) {
        const localPath = path;
        parsedHost = parsedHost || parseHost(host, req);

        if (req.body) {
            runProxy(null, req.body);
        } else if (body) {
            runProxy(null, body);
        } else {
            // 二次触发解析失败，原因未知，暂时用body-parse
            getRawBody(req, {
                length: req.headers['content-length'],
                limit,
                encoding: bodyEncoding(options)
            }, runProxy);
        }

        function runProxy(err, bodyContent) {
            const exec_start_at = Date.now();
            const {host, port, path} = parsedHost;

            const reqOpt = {
                hostname: host,
                port: options.port || port,
                headers: reqHeaders(req, options),
                method: req.method,
                path: (path.charAt(path.length - 1) === '/' ? path.substring(0, path.length - 1) : path) + localPath,
                bodyContent: bodyContent,
                params: req.params,
                rejectUnauthorized: false
            };

            // bodyContent = reqOpt.bodyContent;
            delete reqOpt.bodyContent;
            delete reqOpt.params;

            if (err && !bodyContent) {
                return next(err);
            }

            bodyContent = options.reqAsBuffer
                ? asBuffer(bodyContent, options)
                : asBufferOrString(bodyContent);

            reqOpt.headers['content-length'] = getContentLength(bodyContent);

            if (bodyEncoding(options)) {
                reqOpt.headers['Accept-Encoding'] = bodyEncoding(options);
            }

            const realRequest = parsedHost.module.request(reqOpt, function (resp) {
                const chunks = [];
                resp.on('data', function (chunk) {
                    chunks.push(chunk);
                });

                resp.on('end', function () {
                    const respData = Buffer.concat(chunks, chunkLength(chunks));

                    if (intercept) {
                        intercept(resp, respData, req, res, bodyContent, function (err, respd, sent) {
                            if (err) {
                                return next(err);
                            }

                            respd = asBuffer(respd, options);
                            if (!Buffer.isBuffer(respd)) {
                                next(new Error('intercept should return string or buffer as data'));
                            }

                            if (!res.headersSent) {
                                res.set('Content-Length', respd.length);
                                res.set('X-Execution-Time', String(Date.now() - exec_start_at));
                                if (!resp.headers['content-type']) {
                                    res.set('Content-Type', 'application/json; charset=utf-8');
                                }
                            } else if (respd.length !== respData.length) {
                                const error = '"Content-Length" is already sent, the length of response data can not be changed';
                                next(new Error(error));
                            }

                            if (!sent) {
                                res.send(respd);
                            }
                        })
                    } else {
                        if (!res.headersSent) {
                            res.send(respData);
                        }
                    }
                });

                resp.on('error', function (e) {
                    next(e);
                });

                if (!res.headersSent) {
                    res.status(resp.statusCode);
                    Object.keys(resp.headers)
                        .filter(item => item !== 'transfer-encoding')
                        .forEach(function (item) {
                            res.set(item.replace(/(\w)/, function (v) {
                                return v.toUpperCase()
                            }), resp.headers[item])
                        })
                }
            });

            realRequest.on('error', function (err) {
                try {
                    if (err.code === 'ECONNRESET') {
                        res.setHeader('X-Timout-Reason',
                            'Proxyer timed out your request after ' + options.timeout + 'ms.');
                        res.writeHeader(504, {'Content-Type': 'text/plain'});
                        res.end();
                    } else {
                        next(err);
                    }
                } catch (ex) {
                    res.end();
                }
            });

            if (bodyContent.length) {
                realRequest.write(bodyContent);
            }

            realRequest.end();

            req.on('aborted', function () {
                realRequest.abort();
            });
        }
    }

    function defaultFilter() {
        // No-op version of filter.  Allows everything!
        return true;
    }

    function defaultForwardPath(req) {
        const {pathname, search} = new URL(req.url);
        return pathname + search;
    }

    function defaultForwardPathAsync(forwardPath) {
        return (req, res) => Promise.resolve(forwardPath(req, res));
    }

    function bodyEncoding(options) {
        /*
         * null should be passed forward as the value of reqBodyEncoding,
         * undefined should result in utf-8
         */
        return options.reqBodyEncoding !== 'undefined' ? options.reqBodyEncoding : 'utf-8';
    }

    function reqHeaders(req, options) {
        const headers = options.headers || {};
        const skipHdrs = ['connection', 'content-length', 'accept-encoding'];

        if (!options.preserveHostHdr) {
            skipHdrs.push('host');
        }

        const hds = extend(headers, req.headers, skipHdrs);
        hds.connection = 'close';

        return hds;
    }

    function extend(obj, source, skips) {
        if (!source) {
            return obj;
        }
        const tmpObj = JSON.parse(JSON.stringify(obj));
        for (let prop in source) {
            if (!skips || skips.indexOf(prop) === -1) {
                tmpObj[prop] = source[prop];
            }
        }

        return tmpObj;
    }

    function asBuffer(body, options) {
        let ret;
        if (Buffer.isBuffer(body)) {
            ret = body;
        } else if (typeof body === 'object') {
            ret = Buffer.from(JSON.stringify(body), bodyEncoding(options));
        } else if (typeof body === 'string') {
            ret = Buffer.from(body, bodyEncoding(options));
        }
        return ret;
    }

    function asBufferOrString(body) {
        let ret;
        if (Buffer.isBuffer(body)) {
            ret = body;
        } else if (typeof body === 'object') {
            ret = JSON.stringify(body);
        } else if (typeof body === 'string') {
            ret = body;
        }
        return ret;
    }

    function getContentLength(body) {
        let result;
        if (Buffer.isBuffer(body)) {
            result = body.length;
        } else if (typeof body === 'string') {
            result = Buffer.byteLength(body);
        }
        return result;
    }

    function chunkLength(chunks) {
        return chunks.reduce((len, buf) => len + buf.length, 0);
    }

    function parseHost(host, req) {
        host = (typeof host === 'function') ? host(req) : host.toString();
        if (!host) {
            return new Error('Empty host parameter');
        }

        if (!/http(s)?:\/\//.test(host)) {
            host = 'http://' + host;
        }

        const {protocol, hostname, port, pathname, search} = new URL(host);

        if (!hostname) {
            return new Error('Unable to parse hostname, possibly missing protocol://?');
        }

        const ishttps = protocol === 'https:';

        return {
            host: hostname,
            port: port || (ishttps ? 443 : 80),
            path: pathname + search,
            module: ishttps ? https : http
        };
    }
}
