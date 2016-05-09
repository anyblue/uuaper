##Uuaper
自动登录uuap

##Features
*   自动登录(cookie)

##Get Start

#### install

``` bash
    npm install --save uuaper
```

#### 普通使用请求数据

```js
var uuaper = require('uuaper');
var uuap = new uuaper({
    username: 'xxx',
    password: 'xxx',
    uuapServer: 'http://xxx.baidu.com/login',
    dataServer: 'http://yyy.baidu.com/',
    debug: false
});

// GET请求
uuap.getData(url, function (ret, res, data) {
    console.log(data);
})

// POST请求
uuap.getData(url, {
    id: 1,
    name: 2
}, function (ret, res, data) {
    console.log(data);
})
```

#### 使用uuaper内置server

```js
var uuaper = require('uuaper');
var uuap = new uuaper({
    username: 'xxx',
    password: 'xxx',
    uuapServer: 'http://xxx.baidu.com/login',
    dataServer: 'http://yyy.baidu.com/',
    debug: false
});

uuap.startServer({
    port: 1337, // server端口，不设置默认为1337
    staticPath: __dirname, //静态资源路径，必须设置
    proxyPath: ['/tic'] //Middleware路径
});
```

#### 结合express使用实现接口转发功能

```js
var uuaper = require('uuaper');
var uuap = new uuaper({
    username: 'xxx',
    password: 'xxx',
    uuapServer: 'http://xxx.baidu.com/login',
    dataServer: 'http://yyy.baidu.com/',
    debug: false
});

app.use('/api', function (req, resp) {
    var url = 'xxx' + req.url;
    uuap.getData(url, function (ret, res, data) {
        resp.send(data);
    })
});
```

#### 配置项
1. username  (用户名)
2. password  (密码)
3. uuapServer (uuap认证服务器)
4. dataServer (数据服务器)
5. debug (是否打开调试)

#### 实例方法
1. `Login(callback)` (会自动判断通过cookie还是重新登录，第一次调用即可)
2. `getData(url, callback)` (get请求数据)
3. `postData(url, params, callback)` (post请求)
4. `startServer(options)` (启用内置server，无须单独处理POST/GET请求，如果自己有server就没必要调用该方法)

##TODO
*  ~~支持配置项~~
*  优化结构
*  Do more...