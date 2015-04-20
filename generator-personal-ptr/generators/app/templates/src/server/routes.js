'use strict';


//---------//
// Imports //
//---------//

var path = require('path')
    , Routes = require('../shared/routes')
    , l = require('lambda-js');

//------//
// Init //
//------//

var routesInst = new Routes();


//------//
// Main //
//------//

module.exports = function(app, envInst, currentDir) {
    var routeSeq = routesInst.env(envInst.curEnv()).routeSeq();
    var singlePage = path.join(currentDir, envInst.curEnv(), 'index.html');

    routeSeq
        .where(l('r', 'r.name !== "otherwise"'))
        .each(function(r) {
            app.get(r.url, function(req, res) {
                res.sendFile(singlePage);
            });
        });

    // special cases
    app.get('/', function(req, res) {
        res.sendFile(singlePage);
    });
    app.get("*", function(req, res) {
        res.status(404);
        res.sendFile(singlePage);
    });
};
