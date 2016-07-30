## Uuaper

baidu 自动登录uuap

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
    proxyPath: ['/tic', '/pgm'] //proxy路径
});
```

#### 自定义Cookie

```js
var uuaper = require('uuaper');
var uuap = new uuaper({
    cookie: 'xxx',
    service: 'http://yyy.baidu.com/'
});
```

#### 结合express使用实现接口转发功能

```js
var express = require('express');
var app = express();

var uuaper = require('uuaper');
var uuap = new uuaper({
    express: app,
    username: 'xxx',
    password: 'xxx',
    uuapServer: 'http://xxx.baidu.com/login',
    service: 'http://yyy.baidu.com/',
    debug: true,
    mockDir: __dirname + '/mock'
});

app.use('/api', uuap.loadData);

// express4.0以上 将bodyParser拆分 故post/put等请求需配置
// 也可以将实例化的app用express参数传给uuaper,省去手动配置的麻烦
var bodyParser = require('body-parser')
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
```

#### 配置项

1. username  (用户名)
2. password  (密码)
3. uuapServer (uuap认证服务器，记得带login参数)
4. **service** (必需配置，目标server，或者登出你们的系统，然后取url中service参数)
4. server (转发server默认会取service参数中的域，但是有些项目比较奇葩，故提供该参数)
5. debug (是否打开转发信息，默认`false`不开启)
6. mockDir (如果配置，则会在第一次接口请求结束后存储数据到文件)
7. mock (是否启用mock本地数据，但是依赖`mockDir`参数，如果本地不存在该文件，则会取一遍，默认`false`不开启)
8. mockCache (是否每次请求都进行保存操作，依赖`mockDir`参数，默认`false`不开启)
9. cookie (自定义cookie，配置该参数了就可以不配置`username/password/uuapServer`参数了)

#### 实例方法

1. `startServer(options)` (启用内置server，无须单独处理POST/GET请求，如果自己有server就没必要调用该方法)

##TODO

*  ~~bprouting 302 deal~~
*  ~~支持配置项~~
*  ~~数据mock~~
*  mock 支持带参数的url
*  ~~mock no cache~~
*  ~~静态资源文件proxy~~
*  优化结构
*  Do more...

## History


- [1.2.6] res.headers原封不动返回，来解决流形式响应
- [1.2.3] 增加cookie参数，如果配置，就不使用默认的uuap自动获取方式
- [1.2.0] 增加对静态资源文件的转发支持
- [1.1.4] 增加`mockCache`参数，如果为`true`，则每次请求都会进行保存到本地的操作
- [1.1.0] 增加接口数据mock功能
- [1.0.5] `server`参数改成非必须参数，默认取service中的域，但是有些项目比较奇葩，故提供该参数
- [1.0.x] 重构，使用[bird-auth](https://www.npmjs.com/package/bird-auth)包进行cookie获取，同时优化内置server
- [0.1.7] 老版本
