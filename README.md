##Uuaper
自动登录uuap

##Features
*   自动登录(cookie)

##Get Start

#### install

``` bash
    npm install --save uuaper
```

#### 普通使用

```js
var uuaper = require('uuaper');
var uuap = new uuaper({
    username: 'xxx',
    passwork: 'xxx',
    uuapServer: 'http://xxx.baidu.com/login',
    dataServer: 'http://yyy.baidu.com/',
    debug: false
});

// 请求数据
uuap.getData(url, function (ret, res, data) {
    console.log(data);
})
```

#### 结合express使用实现接口转发功能

```js
var uuaper = require('uuaper');
var uuap = new uuaper({
    username: 'xxx',
    passwork: 'xxx',
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
2. `getData(url, callback)` (请求数据)

##TODO
*  ~~支持配置项~~
*  优化结构
*  Do more...