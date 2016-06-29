var uuaper = require('../index');

var uuap = new uuaper({
    username: 'liuyong06',
    password: 'liuyong06',
    uuapServer: 'http://itebeta.baidu.com:8100/login',
    dataServer: 'http://bidev.baidu.com/tic/',
    debug: false
});

// uuap.startServer({
//     port: 1337,
//     staticPath: __dirname,
//     proxyPath: ['/tic']
// });

// uuap.getData('http://bidev.baidu.com/tic/common/getLoginUser', function (err, res, data) {
//     console.log(data);
// })