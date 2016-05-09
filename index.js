var client = require('./lib/UuapClient');
var fs = require('fs');
var login = require('./src/uuap');
var url = require('url');
var http = require('http');
var connect = require('connect');
var querystring = require('querystring');
// process.env.DEBUG = true;

var mimetype = {
    'txt': 'text/plain',
    'html': 'text/html',
    'css': 'text/css',
    'xml': 'application/xml',
    'json': 'application/json',
    'js': 'application/javascript',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'png': 'image/png',
    'svg': 'image/svg+xml'
}

var page_404 = function(req, res, path){
    res.writeHead(404, {
      'Content-Type': 'text/html'
    });
    res.write('<!doctype html>\n');
    res.write('<title>404 Not Found</title>\n');
    res.write('<h1>Not Found</h1>');
    res.write('<p>The requested URL ' + path + ' was not found on this server.</p>');
    res.end();
}

var page_500 = function(req, res, error){
    res.writeHead(500, {
      'Content-Type': 'text/html'
    });
    res.write('<!doctype html>\n');
    res.write('<title>Internal Server Error</title>\n');
    res.write('<h1>Internal Server Error</h1>');
    res.write('<pre>' + util.inspect(error) + '</pre>');
}

var Uuaper = module.exports = function (options) {
    global.username = (options && options.username) || 'liuyong06';
    global.password = (options && options.password) || (options && options.username) || 'liuyong06';
    global.uuapServer = (options && options.uuapServer) || 'http://itebeta.baidu.com:8100/login';
    global.dataServer = (options && options.dataServer) || 'http://bidev.baidu.com/tic/';
    global.debug = (options && options.debug) || false;
};

Uuaper.prototype.Login = function (cb) {
    login.Login(cb);
};

Uuaper.prototype.getData = function (url, cb, params) {
    var self = this;
    return client.get(url, function(err, res, data) {
        if (res.statusCode == '302') {
            global.isLogin = false;
            self.Login(function() {
                global.isLogin = true;
                self.getData(url, cb)
            })
            return;
        }
        return cb(err, res, data);
    })
};

Uuaper.prototype.postData = function (url, params, cb) {
    var self = this;
    return client.post(url, params, function(err, res, data) {
        if (res.statusCode == '302') {
            global.isLogin = false;
            self.Login(function() {
                global.isLogin = true;
                self.getData(url, cb)
            })
            return;
        }
        return cb(err, res, data);
    })
};

Uuaper.prototype.startServer = function (options) {
    if (!options) {
        console.log('请设置参数')
    }
    var self = this;
    var app = connect();

    if (options.proxyPath) {
        for (var i = 0; i < options.proxyPath.length; i++) {
            // 需要转发的
            app.use(options.proxyPath[i], function barMiddleware(req, res, next) {
                var tmp = url.parse(global.dataServer);
                var dataurl = tmp.protocol + '//' + tmp.host + (tmp.path.split('')[tmp.path.split('').length - 1] == '/' ? tmp.path.substring(0, tmp.path.length - 1) : tmp.path) + req.url;
                console.log('http://' + req.headers.host + req.originalUrl + '  ========>  ' + dataurl);
                if (req.method === 'POST') {
                    var postData = '';
                    // 数据块接收中
                    req.addListener('data', function (postDataChunk) {
                        postData += postDataChunk;
                    });
                    req.addListener('end', function () {
                        // console.log('数据接收完毕');
                        var params = querystring.parse(postData);
                        self.postData(dataurl, params, function (err, resp, data) {
                            res.end(data);
                        });
                    });
                }
                else {
                    self.getData(dataurl, function (err, resp, data) {
                        res.end(data);
                    });
                }
            });
        }
    }

    app.use(function(req, res){
        var pathname = url.parse(req.url).pathname;
        var realPath = options.staticPath + pathname;
        fs.exists(realPath, function(exists){
            if(!exists){
                return page_404(req, res, pathname);
            } else {
                var file = fs.createReadStream(realPath);
                res.writeHead(200, {
                    'Content-Type': mimetype[realPath.split('.').pop()] || 'text/plain'
                });
                file.on('data', res.write.bind(res));
                file.on('close', res.end.bind(res));
                file.on('error', function(err){
                    return page_500(req, res, err);
                });
            }
        });
    });
    http.createServer(app).listen(options.port || 3000);
    console.log('Server running at http://127.0.0.1:' + (options.port || 3000) + '/');
};