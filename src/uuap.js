var client = require('../lib/UuapClient');
var fs = require('fs');
var URL = require('url');
var request = require('request')

exports.Login = function (callback) {
    var self = this;
    //获取Uuap
    if (global.debug) console.log('获取Uuap');
    var uuapUrl = global.uuapServer;
    client.url_get(uuapUrl, function(err, res, data) {
        if (global.debug) console.log('获取成功');
        global.lt = data.match(/name="lt" value="(.+?)"/)[1];
        global.execution = data.match(/name="execution" value="(.+?)"/)[1];
        uuapPost(callback)
    });
};

exports._Login = function (cookies, callback) {
    var self = this
    //设置Cookie
    if (global.debug) console.log('设置Cookie');
    client.set_cookies(cookies);
    client.get(global.dataServer, function(err, res, data){
        if (res.statusCode == '302') {
            self.Login(callback)
        }
        else {
            callback();
        }
    })
};

function uuapPost(callback) {
    var self = this;

    if (global.debug) console.log('登录中...');
    //Post登录
    var form = {
        username: global.username,
        password: global.password,
        rememberMe: 'on',
        lt: global.lt,
        execution: global.execution,
        _eventId: 'submit',
        type: 1
    };
    var tmp = URL.parse(global.uuapServer)
    client.url_post({
        protocol: tmp.protocol,
        host: tmp.hostname,
        port: tmp.port,
        path: tmp.path,
        method: 'POST',
        headers: {
            'Referer': global.uuapServer,
        }
    }, form, function (err, res, data) {
        client.get(global.uuapServer + '?service=' + global.dataServer, function(err, res, data) {
            var updateUrl = res.headers.location;

            client.url_get(updateUrl, function(err, res, data) {
                if (global.debug) console.log('登录成功');
                fs.writeFile('./cookie.data', client.get_cookies());
                callback()
            });
        });
    });

};