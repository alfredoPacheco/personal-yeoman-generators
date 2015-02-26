'use strict';


//---------//
// Imports //
//---------//

var path = require('path')
    , Routes = require('../../shared/routes')
    , l = require('lambda-js');

//------//
// Init //
//------//

var routesInst = new Routes();


//------//
// Main //
//------//

module.exports = function(app, curEnv) {
    app.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
        var routeSeq = routesInst.env(curEnv).routeSeq();

        routeSeq
            .where(l('r', 'r.name !== "otherwise"'))
            .each(function(r) {
                $routeProvider.when(r.url, {
                    templateUrl: r.path
                });
            });

        // Best guess for special cases
        //   special cases are routes with the names 'otherwise' and 'home'
        var home = routeSeq.find(l('r', 'r.name === "home"'));
        if (home) {
            $routeProvider.when('/', {
                redirectTo: '/home'
            });
        }
        var otherwise = routeSeq.find(l('r', 'r.name === "otherwise"'));
        if (otherwise) {
            $routeProvider.otherwise({
                templateUrl: otherwise.path
            });
        }

        $locationProvider.html5Mode(true);
    }]);
};
