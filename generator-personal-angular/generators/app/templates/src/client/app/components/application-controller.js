'use strict';

var $ = require('jquery');
var initSiteLayout = require('./site-init');

module.exports = function(app, log) {
    app.controller('ApplicationController', ['$scope', function($scope) {
        initSiteLayout($, $scope, log);
    }]);
};
