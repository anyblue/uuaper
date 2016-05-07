var uuaper = require('../index');

var uuap = new uuaper({
    username: 'liuyong06',
    password: 'liuyong06',
    uuapServer: 'http://itebeta.baidu.com:8100/login',
    dataServer: 'http://bidev.baidu.com/tic/',
    debug: false
});
 
if (!global.isLogin) {
    uuap.Login(function(res){
        global.isLogin = true;
        uuap.getData('http://bidev.baidu.com/tic/common/getLoginUser', function (ret, res, data) {
            console.log(data);
        })
    });
}
else {
    uuap.getData('http://bidev.baidu.com/tic/common/getLoginUser', function (ret, res, data) {
        console.log(data);
    })
}