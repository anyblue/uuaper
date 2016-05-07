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
    uuapServer: 'xxx',
    dataServer: 'xxx',
    debug: false
});

if (!global.isLogin) {
    uuap.Login(function(){
        global.isLogin = true;
        uuap.getData(url, function (err, res, data) {
            console.log(data);
        })
    });
}
else {
    uuap.getData(url, function (err, res, data) {
        console.log(data);
    })
}
```

#### 结合express使用实现数据mock功能

```js
var uuaper = require('uuaper');
var uuap = new uuaper({
    username: 'xxx',
    passwork: 'xxx',
    uuapServer: 'xxx',
    dataServer: 'xxx',
    debug: false
});

app.use('/api', function (req, resp) {
    var url = 'xxx' + req.url;
    if (!global.isLogin) {
        uuap.Login(function(){
            global.isLogin = true;
            uuap.getData(url, function (err, res, data) {
                resp.send(data);
            })
        });
    }
    else {
        uuap.getData(url, function (err, res, data) {
            resp.send(data);
        })
    }
});
```

#### 配置项
1. username  (用户名)
2. password  (密码)
3. uuapServer (uuap认证服务器)
4. dataServer (数据服务器)
5. debug (是否打开调试)

##TODO
*  ~~支持配置项~~
*  热切换账户
*  优化结构
*  Do more...