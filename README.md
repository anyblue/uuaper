## Uuaper

~~baidu~~ 自动登录uuap

## Features
*   自动登录(cookie)

## Get Start

#### install

``` bash
    npm install --save uuaper
```

#### 使用uuaper内置server

```js
var uuaper = require('uuaper');
var uuap = new uuaper({
    username: 'xxx',
    password: 'xxx',
    uuapServer: 'http://xxx.baidu.com/login',
    service: 'http://yyy.baidu.com/'
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
    service: 'http://yyy.baidu.com/'
});

app.use('/api', uuap.loadData);
```

#### 配置项

1. username  (用户名)
2. password  (密码)
3. uuapServer (uuap认证服务器,记得带login参数)
4. service (如果你不知道, 你可以登出你的系统，然后取`service`参数)

#### 实例方法

1. `startServer(options)` (启用内置server，无须单独处理POST/GET请求，如果自己有server就没必要调用该方法)

##TODO

*  ~~支持配置项~~
*  数据mock
*  优化结构
*  Do more...

## History

- [1.0.0] 重构，使用[bird-auth](https://www.npmjs.com/package/bird-auth)包进行cookie获取，同时优化内置server
- [0.1.7] 老版本
