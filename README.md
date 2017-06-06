# Uuaper

[![NPM Version][npm-image]][npm-url]
![NODE Version][node-image]
![OSX Build][osx-image]
![LINUX Build][liunx-image]

Proxy tool based on NodeJS for front-end development.

## Feature

* 前后端分离，前端会有跨域问题，本工具提供server端proxy :)
* _baidu_ uuap 自动登录

## Install

``` bash
    npm install --save uuaper
```

## 配置项

| name | detail |
| :----- | :----- |
| `targer` | proxy url |
| `debug` | default: `false` |
| `headers` | request headers |
| `mock` | mock local files, default: `false` |
| `cache` | cache dir, only cache content-type is json request |
| `server` | build-in server settings, include(`port`, `staticPath`, `proxyPath`) |
| `auth` | baidu uuap, settings visit [bird-auth](https://www.npmjs.com/package/bird-auth) |

## Usage

### 自定headers & 启动 server

```javascript
var uuaper = require('uuaper');
var uuap = new uuaper({
    target: 'http://xxx.xxx.com/',
    header: {
        cookie: 'xxx'
    },
    debug: true,
    server: {
        port: 1337,
        staticPath: __dirname,
        proxyPath: ['/aaa'] // 需要转发的context路径，譬如/aaa下面的所有请求都走proxy
    }
});
```

#### 结合express使用实现接口转发功能

```javascript
var express = require('express');
var app = express();

var uuaper = require('uuaper');
app.use('/api', new uuaper({
    target: 'http://xxx.baidu.com/',
    debug: true,
    headers: {
        refer: 'http://xxx.com'
    },
    cache: './cache'
}));
```

#### baidu uuap 自动认证

```javascript
var uuaper = require('uuaper');
var uuap = new uuaper({
    target: 'http://xxx.xxx.com/',
    auth: {
        username: 'xxx',
        password: 'xxx',
        server: 'http://xxx.baidu.com/login?',
        retry: function(res, data) {
            return +res.statusCode === 403;
        }
    }
});
```

<!--## 配置项-->

<!--- **service** (必需配置，目标server，或者登出你们的系统，然后取url中service参数)-->
<!--- cookie (自定义cookie，配置了该参数就无需配置`username/password/uuapServer`)-->
<!--- username  (用户名)-->
<!--- password  (密码)-->
<!--- uuapServer (uuap认证服务器，记得带login参数)-->
<!--- server (转发server默认会取service参数中的域，但是有些项目比较奇葩，故提供该参数)-->
<!--- debug (是否打开转发信息，默认`false`不开启)-->
<!--- mockDir (如果配置，则会在第一次接口请求结束后存储数据到文件)-->
<!--- mock (是否启用mock本地数据，依赖`mockDir`，如果本地不存在该文件，则会取一遍，默认`false`)-->
<!--- mockCache (是否每次请求都进行保存操作，依赖`mockDir`参数，默认`false`不开启)-->

##TODO

*  mock 支持带参数的url
*  cache 支持多类型
*  ~~bprouting 302 deal~~
*  ~~支持配置项~~
*  ~~数据mock~~
*  ~~mock no cache~~
*  ~~静态资源文件proxy~~
*  Do more...

## History

- [2.0.0] 配置项优化
- [1.3.4] `content-type`处理优化
- [1.3.3] 增加`content-type`为`stream`判断
- [1.3.1] `rejectUnauthorized: false`处理https证书问题
- [1.3.0] 重构proxy模块，也许是该项目最大的一次重构
- [1.2.6] res.headers原封不动返回，来解决流形式响应
- [1.2.3] 增加cookie参数，如果配置，就不使用默认的uuap自动获取方式
- [1.1.0] 增加接口数据mock功能
- [1.0.x] 重构，使用[bird-auth](https://www.npmjs.com/package/bird-auth)包进行cookie获取，同时优化内置server
- [0.1.7] 老版本

[npm-image]: https://img.shields.io/badge/npm-v2.0.1-blue.svg
[npm-url]: https://npmjs.org/package/uuaper
[node-image]: https://img.shields.io/badge/node-v0.12.0%2B-yellow.svg
[osx-image]: https://img.shields.io/badge/OSX-passing-brightgreen.svg
[liunx-image]: https://img.shields.io/badge/Liunx-passing-brightgreen.svg
