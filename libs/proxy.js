'use strict';

var url = require('url');
var http = require('http');
var https = require('https');
var getRawBody = require('raw-body');
var promise = require('es6-promise');

module.exports = function (host, options) {

    options = options || {};

    var parsedHost;

    var body = options.defaultBody;
    var intercept = options.intercept;
    var limit = options.limit || '10mb';
    var filter = options.filter || defaultFilter;
    var forwardPath = options.forwardPath || defaultForwardPath;
    var forwardPathAsync = options.forwardPathAsync || defaultForwardPathAsync(forwardPath);

    return function handleProxy(req, res, next) {
        if (!filter(req, res)) return next();
        forwardPathAsync(req, res)
            .then(function (path) {
                proxyWithResolvedPath(req, res, next, path);
            })
    };

    function proxyWithResolvedPath(req, res, next, path) {
        // console.log(req)
        parsedHost = parsedHost || parseHost(host, req);

        if (req.body) {
            runProxy(null, req.body);
        }
        else if (body) {
            runProxy(null, body);
        }
        else {
            // 二次触发解析失败，原因位置，暂时用body-parse
            getRawBody(req, {
                length: req.headers['content-length'],
                limit: limit,
                encoding: bodyEncoding(options)
            }, runProxy);
        }

        function runProxy(err, bodyContent) {
            var exec_start_at = Date.now();
            // console.log(bodyContent)

            var reqOpt = {
                hostname: parsedHost.host,
                port: options.port || parsedHost.port,
                headers: reqHeaders(req, options),
                method: req.method,
                path: (parsedHost.path.charAt(parsedHost.path.length - 1) === '/'
                    ? parsedHost.path.substring(0, parsedHost.path.length - 1)
                    : parsedHost.path) + path,
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

            // console.log(reqOpt)
            var realRequest = parsedHost.module.request(reqOpt, function (resp) {
                var chunks = [];
                resp.on('data', function (chunk) {
                    chunks.push(chunk);
                });

                resp.on('end', function () {

                    var respData = Buffer.concat(chunks, chunkLength(chunks));

                    if (intercept) {
                        intercept(resp, respData, req, res, bodyContent, function (err, respd, sent) {
                            if (err) {
                                return next(err);
                            }
                            // console.log(respData.toString())
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
                            }
                            else if (respd.length !== respData.length) {
                                var error = '"Content-Length" is already sent, the length of response data can not be changed';
                                next(new Error(error));
                            }
                            // console.log(res)
                            if (!sent) {
                                res.send(respd);
                            }
                        })
                    }
                    else {
                        if (!res.headersSent) {
                            res.send(respData);
                        }
                    }
                });

                resp.on('error', function (e) {
                    next(e);
                });

                if (!res.headersSent) {
                    // console.log(resp.headers);
                    res.status(resp.statusCode);
                    Object.keys(resp.headers)
                        .filter(function (item) {
                            return item != 'transfer-encoding';
                        })
                        .forEach(function (item) {
                            // .replace(/(\w)/,function(v){return v.toUpperCase()})
                            res.set(item.replace(/(\w)/, function (v) {
                                return v.toUpperCase()
                            }), resp.headers[item])
                        })
                }
            });
            // console.log(realRequest)
            realRequest.on('error', function (err) {
                if (err.code === 'ECONNRESET') {
                    res.setHeader('X-Timout-Reason',
                        'Proxyer timed out your request after ' + options.timeout + 'ms.');
                    res.writeHeader(504, {'Content-Type': 'text/plain'});
                    res.end();
                }
                else {
                    next(err);
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
        return url.parse(req.url).path;
    }

    function defaultForwardPathAsync(forwardPath) {
        return function (req, res) {
            return new promise.Promise(function (resolve) {
                resolve(forwardPath(req, res));
            });
        };
    }

    function bodyEncoding(options) {
        /*
         null should be passed forward as the value of reqBodyEncoding,
         undefined should result in utf-8
         */
        return options.reqBodyEncoding !== 'undefined' ? options.reqBodyEncoding : 'utf-8';
    }

    function reqHeaders(req, options) {
        var headers = options.headers || {};

        var skipHdrs = ['connection', 'content-length', 'accept-encoding'];

        if (!options.preserveHostHdr) {
            skipHdrs.push('host');
        }

        var hds = extend(headers, req.headers, skipHdrs);
        hds.connection = 'close';
        // hds['accept-encoding']
        // console.log(hds)
        return hds;
    }

    function extend(obj, source, skips) {
        if (!source) {
            return obj;
        }
        var tmpObj = JSON.parse(JSON.stringify(obj));
        for (var prop in source) {
            if (!skips || skips.indexOf(prop) === -1) {
                tmpObj[prop] = source[prop];
            }
        }

        return tmpObj;
    }

    function asBuffer(body, options) {
        var ret;
        if (Buffer.isBuffer(body)) {
            ret = body;
        }
        else if (typeof body === 'object') {
            ret = new Buffer(JSON.stringify(body), bodyEncoding(options));
        }
        else if (typeof body === 'string') {
            ret = new Buffer(body, bodyEncoding(options));
        }
        return ret;
    }

    function asBufferOrString(body) {
        var ret;
        if (Buffer.isBuffer(body)) {
            ret = body;
        }
        else if (typeof body === 'object') {
            ret = JSON.stringify(body);
        }
        else if (typeof body === 'string') {
            ret = body;
        }
        return ret;
    }

    function getContentLength(body) {
        var result;
        if (Buffer.isBuffer(body)) {
            result = body.length;
        }
        else if (typeof body === 'string') {
            result = Buffer.byteLength(body);
        }
        return result;
    }

    function chunkLength(chunks) {
        return chunks.reduce(function (len, buf) {
            return len + buf.length;
        }, 0);
    }

    function parseHost(host, req) {
        // console.log(arguments)
        host = (typeof host === 'function') ? host(req) : host.toString();
        if (!host) {
            return new Error('Empty host parameter');
        }

        if (!/http(s)?:\/\//.test(host)) {
            host = 'http://' + host;
        }

        var parsed = url.parse(host);

        if (!parsed.hostname) {
            return new Error('Unable to parse hostname, possibly missing protocol://?');
        }

        var ishttps = parsed.protocol === 'https:';

        return {
            host: parsed.hostname,
            port: parsed.port || (ishttps ? 443 : 80),
            path: parsed.path,
            module: ishttps ? https : http
        };
    }
}