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
    service: 'http://yyy.baidu.com/',
    mock: true,
    mockDir: __dirname + '/mock'
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
    service: 'http://yyy.baidu.com/',
    debug: true,
    mockDir: __dirname + '/mock'
});

app.use('/api', uuap.loadData);

// post/put等请求需配置
var bodyParser = require('body-parser')
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
```

#### 配置项

1. username  (用户名)
2. password  (密码)
3. uuapServer (uuap认证服务器，记得带login参数)
4. service (如果你不知道，你可以登出你的系统，然后取`service`参数)
4. server (转发server默认会取service参数中的域，但是有些项目比较奇葩，故提供该参数)
5. debug (是否打开转发信息，默认`false`不开启)
6. mockDir (如果配置，则会在第一次接口请求结束后存储数据到文件)
7. mock (是否启用mock本地数据，但是依赖`mockDir`参数，如果本地不存在该文件，则会取一遍，默认`false`不开启)
8. mockCache (是否每次请求都进行保存操作，依赖`mockDir`参数，默认`false`不开启)

#### 实例方法

1. `startServer(options)` (启用内置server，无须单独处理POST/GET请求，如果自己有server就没必要调用该方法)

##TODO

*  ~~支持配置项~~
*  ~~数据mock~~
*  mock 支持带参数的url
*  ~~mock no cache~~
*  优化结构
*  Do more...

## History

- [1.1.4] 增加`mockCache`参数，如果为`true`，则每次请求都会进行保存到本地的操作
- [1.1.3] mock数据时,如果不存在,则会请求一次 && status 403 处理
- [1.1.0] 增加接口数据mock功能
- [1.0.5] `server`参数改成非必须参数，默认取service中的域，但是有些项目比较奇葩，故提供该参数
- [1.0.x] 重构，使用[bird-auth](https://www.npmjs.com/package/bird-auth)包进行cookie获取，同时优化内置server
- [0.1.7] 老版本
