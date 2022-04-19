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
    npm install --save-dev uuaper
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
| `auth` | auth logic |

### auth

| name | detail |
| :----- | :----- |
| `getAuth(cb)` | you auth logic |
| `forwardCookie(cb)` | before make sure cookie |
| `retry(res, data)` | retry logic |
| baidu auth setting | baidu uuap auth [bird-auth](https://www.npmjs.com/package/bird-auth) |

## Usage

### 自定义headers & 启动server

```javascript
const uuaper = require('uuaper');
const uuap = new uuaper({
    target: 'http://xxx.xxx.com/',
    headers: {
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
const express = require('express');
const app = express();

const uuaper = require('uuaper');
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
const uuaper = require('uuaper');
const uuap = new uuaper({
    target: 'http://xxx.xxx.com/',
    auth: {
        username: 'xxx',
        password: 'xxx',
        server: 'http://xxx.xxx.com/login?service=xxxx',
        retry: function(res, data) {
            return +res.statusCode === 403;
        }
    }
});
```

#### 手动设置 cookie 内容

```javascript
const uuaper = require('uuaper');
const uuap = new uuaper({
    target: 'http://xxx.xxx.com/',
    auth: {
        username: 'xxx',
        password: 'xxx',
        type: 1, // default 1 is username and password; 3 is username and verification code.
        server: 'http://xxx.xxx.com/login?service=xxxx',
        retry: function(res, data) {
            return +res.statusCode === 403;
        },
        getAuth: function(cb) {
            cb('your cookies');
        }
    }
});
```

#### baidu passport 自动认证

```javascript
const uuaper = require('uuaper');
const uuap = new uuaper({
    target: 'http://xxx.xxx.com/',
    auth: {
        type: 'passport',
        username: 'xxx',
        password: 'xxx',
        server: 'https://passport.qatest.xxx.com/', //default passport.xxx.com
        forwardCookie: function (cb) {
            // use `uuaper.client` do something to get extrenal cookie
            uuaper.client.get('xxx.baidu.com', function () {
                cb && cb(uuaper.client.get_cookies_string());
            });
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

## History

- [3.3.2] 支持服务启动后，cookie 的更新
- [3.3.1] 支持验证码方式
- [3.3.0] 升级bird-auth，修复 token 获取失效问题。
- [3.2.0] 升级bird-auth，兼容新版验证机制
- [3.1.4] 修复接口出错，导致服务不能启动问题
- [3.1.3] 代码优化，修复缓存目录错误
- [3.1.0] 修复重构代码导致的runProxy错误，移除es-promise和fs-path包。
- [3.0.0] update new auth.
- [2.0.9] update bird-auth.
- [2.0.8] fix fsPath.writeFile error
- [2.0.7] add request body size `limit` setting
- [2.0.6] 支持自定义 `auth logic`
- [2.0.5] 增加baidu.passport支持 & headers bugfix
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

[npm-image]: https://img.shields.io/badge/npm-v5.3.6-blue.svg
[npm-url]: https://npmjs.org/package/uuaper
[node-image]: https://img.shields.io/badge/node-v10.0.0%2B-yellow.svg
[osx-image]: https://img.shields.io/badge/OSX-passing-brightgreen.svg
[liunx-image]: https://img.shields.io/badge/Liunx-passing-brightgreen.svg
