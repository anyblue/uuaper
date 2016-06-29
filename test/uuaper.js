'use strict';

var express = require('express');
var bodyParser = require('body-parser');

var app = express();

var Uuaper = require('../index');

var uuap = new Uuaper({
    username: 'liuyong06',
    password: 'liuyong06',
    uuapServer: 'http://itebeta.baidu.com:8100/login',
    service: 'http://bidev.baidu.com/talent/',
    server: 'http://bidev.baidu.com/'
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/talent', uuap.loadData);

app.listen(8000, function () {
    console.log('Server listening on http://localhost:8000, Ctrl+C to stop')
});