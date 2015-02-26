'use strict';


//---------//
// Imports //
//---------//

var nh = require('node-helpers')
    , path = require('path');


//------//
// Init //
//------//

var Utils = nh.utils
    , Environment = nh.Environment
    , lazy = nh.lazyExtensions;


//------//
// Main //
//------//

function ARoute(name_, url_, path_, env_) {
    this.name = name_;
    this.url = '/' + url_;
    this.path = path.join(env_, 'app/components/', path_ + '.html');
}

function Routes(env_) {
    var my = {
        env: null
        , routeSeq: null
    };

    this.env = function env(env_) {
        var res = my.env;
        if (typeof env_ !== 'undefined') {
            if (env_ !== null) {
                Routes.ValidateEnv(env_, true);

                if (Utils.instance_of(env_, Environment)) {
                    env_ = env_.curEnv();
                }
            }

            my.env = env_;
            res = this;
        }
        return res;
    };

    this.routeSeq = function routeSeq(nothing) {
        var self = this;

        if (typeof nothing !== 'undefined') {
            throw new Error("Invalid Argument: <Routes>.routeSeq is read-only");
        } else if (self.env === null) {
            throw new Error("Invalid State: <Routes>.env must be set before retrieving the route sequence");
        }

        // if my.routeSeq hasn't been initialized yet, then let's initialize it
        if (my.routeSeq === null) {
            var objRoutes = require('./routesObj');
            my.routeSeq = [];
            Object.keys(objRoutes).forEach(function(r) {
                my.routeSeq.push(new ARoute(
                    r
                    , objRoutes[r].url
                    , objRoutes[r].path
                    , self.env()
                ));
            });

            my.routeSeq = lazy(my.routeSeq);
        }

        return my.routeSeq;
    };
}


//-----------------------//
// Validation Extensions //
//-----------------------//

Routes.ValidateEnv = function ValidateEnv(input_, throwErr_) {
    var msg = '';
    if (typeof input_ !== 'string' && !Utils.instance_of(input_, Environment)) {
        msg = 'Invalid Argument: <Routes>.env expects eiter an Environment object or an environment string.';
    } else if (typeof input_ === 'string') {
        msg = Environment.validateEnv(input_);
    }

    if (throwErr_ && msg) {
        throw new Error(msg);
    }

    return msg;
};


//---------//
// Exports //
//---------//

module.exports = Routes;
