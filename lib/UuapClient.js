var https = require('https');
var http = require('http');
var URL = require('url');
var querystring = require('querystring');
var _ = require('lodash');

var all_cookies = []

var get_cookies = function() {
    return all_cookies;
};

var get_cookies_string = function () {

    var cookie_map = {};

    all_cookies.forEach(function (ck) {
        var v = ck.split(' ')[0];
        var kv = v.trim().split('=');
        if (kv[1] != ';') {
            cookie_map[kv[0]] = kv[1];
        }
    });

    var cks = [];
    for (var k in cookie_map) {
        cks.push(k + '=' + cookie_map[k]);
    }

    return cks.join(' ')
}

var set_cookies = function(cks) {
    all_cookies = []
    var ck = [];
    cks.split('; ').forEach(function (item, i) {
        if (i != cks.split('; ').length - 1) item += ';';
        ck.push(item);
    });
    update_cookies(ck)
};

var update_cookies = function (cks) {
    if (cks) {
        all_cookies = _.union(all_cookies, cks);
    }
}

var global_cookies = function(cookie) {
  if (cookie) {
      update_cookies(cookie);
  }
  return get_cookies();
};

var url_get = function (url_or_options, callback, pre_callback) {
    var http_or_https = http;

    // http or https判断
    if (((typeof url_or_options === 'string') && (url_or_options.indexOf('https:') === 0)) || ((typeof url_or_options === 'object') && (url_or_options.protocol === 'https:'))) {
         http_or_https = https;
    }

    if (global.debug) {
        console.log('url_or_options: ' + url_or_options);
        console.log('<==================================我是分割线===============================>');
    }

    return http_or_https.get(url_or_options, function(resp) {

        if (pre_callback !== undefined) {
            pre_callback(resp)
        }

        all_cookies = []
        update_cookies(resp.headers['set-cookie']);

        var res = resp;
        var body = '';
        resp.on('data', function (chunk) {
            return body += chunk;
        })

        return resp.on('end', function () {
            if (global.debug) {
                console.log('statusCode: ' + resp.statusCode);
                console.log('<==================================我是分割线===============================>');
                console.log('cookie: ' + all_cookies);
                console.log('<==================================我是分割线===============================>');
                // console.log('body: ' + body);
                // console.log('<==================================我是分割线===============================>');
            }
            return callback(0, res, body);
        })
    }).on('error', function (e) {
        return console.log(e);
    });
}

var url_post = function (options, form, callback) {
    var http_or_https = http;

    // http or https判断
    if(((typeof options === 'object') && (options.protocol === 'https:'))) {
         http_or_https = https;
    }

    var postData = querystring.stringify(form);

    if (typeof options.headers !== 'object') {
        options.headers = {};
    }
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    options.headers['Content-Length'] = Buffer.byteLength(postData);
    options.headers['Cookie'] = get_cookies_string();
    options.headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.94 Safari/537.36';

    if (global.debug) {
        console.log(options.headers, postData);
        console.log('<==================================我是分割线===============================>');
    }

    // if (options.timeout) {
    //      http_or_https.request(options.timeout, function(){

    //     });
    // }
 
    var req = http_or_https.request(options, function (resp) {
        var res = resp;
        var body = '';
        resp.on('data', function (chunk) {
            body += chunk;
        })

        // all_cookies = []
        update_cookies(resp.headers['set-cookie']);

        return resp.on('end', function (argument) {
            if (global.debug) {
                console.log(resp.statusCode, resp.headers);
                console.log('<==================================我是分割线===============================>');
            }
            return callback(0, res, body);
        })
    }).on('error', function () {
        return console.log(e);
    });

    req.write(postData);

    return req.end();
}

var http_request = function (options, params, callback) {
    var append, aurl, body, client, data, query, req;
    aurl = URL.parse(options.url);
    options.host = aurl.host.split(':')[0];
    options.path = aurl.path;
    options.port = aurl.host.split(':')[1] ? aurl.host.split(':')[1] : '80';
    options.headers || (options.headers = {});
    client = aurl.protocol === 'https:' ? https : http;
    body = '';

    if (params && options.method === 'POST') {
        data = querystring.stringify(params);
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
        options.headers['Content-Length'] = Buffer.byteLength(data);
    }
    if (params && options.method === 'GET') {
        query = querystring.stringify(params);
        append = aurl.query ? '&' : '?';
        options.path += append + query;
    }

    options.headers['Cookie'] = get_cookies_string();
    options.headers['Referer'] = global.uuapServer;
    options.headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36';

    if (global.debug) {
        console.log(options);
        console.log('<==================================我是分割线===============================>');
    }

    req = client.request(options, function(resp) {
        if (options.debug) {
            console.log('response: ' + resp.statusCode);
            console.log('cookie: ' + resp.headers['set-cookie']);
        }

        resp.on('data', function(chunk) {
            return body += chunk;
        });

        return resp.on('end', function() {
            if (global.debug) {
                console.log(resp.statusCode, resp.headers);
                console.log('<==================================我是分割线===============================>');
            }
            // return handle_resp_body(body, options, callback);
            return callback(0, resp, body);
        });
    });

    req.on('error', function(e) {
        return callback(null, e);
    });

    if (params && options.method === 'POST') {
        req.write(data);
    }

    return req.end();
}

var handle_resp_body = function(body, options, callback) {
    var ret = null;
    try {
        ret = JSON.parse(body);
    } catch (err) {
        console.log('解析出错', options.url);
        return callback(null, err);
    }
    console.log(options)
    return callback(options, null);
};

var http_get = function (url, params, callback) {
    if (!callback) {
        callback = params;
        params = null;
    }
    var options = {
        method: 'GET',
        url: url
    };
    return http_request(options, params, callback);
};

var http_post = function(options, body, callback) {
    options.method = 'POST';
    return http_request(options, body, callback);
};

module.exports = {
    url_get: url_get,
    url_post: url_post,
    get: http_get,
    post: http_post,
    request: http_request,
    get_cookies: get_cookies,
    set_cookies: set_cookies,
    get_cookies_string: get_cookies_string,
    update_cookies: update_cookies
};