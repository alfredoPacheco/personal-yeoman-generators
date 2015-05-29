'use strict';

//---------//
// Imports //
//---------//

var angular = require('angular')
    , nh = require('node-helpers');


//------//
// Init //
//------//

var envInst = new nh.Environment();
var log = new nh.LogProvider().getLogger();

var app = angular.module('<%= angularModuleName %>', [require('angular-route')]);
// load the template cache
require('./templates');

//------------//
// Add Routes //
//------------//

require('./routes')(app, envInst.curEnv());


//-----------------//
// Add Controllers //
//-----------------//

require('./components/application-controller')(app, log);


//----------------//
// Add Directives //
//----------------//

require('./components/error404.js')(app, log);
