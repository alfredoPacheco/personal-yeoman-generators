'use strict';

var bPromise = require('bluebird')
    , bNpm = bPromise.promisifyAll(require('npm'));

//-----//
// API //
//-----//
//
// Function
//   - installAsync
//
// Parameters
//   + where: string
//   - packages: [string]

bNpm.commands.installAsync = function(where, packages) {
    return new bPromise(function(resolve, reject) {
        if (arguments.length === 2) {
            bNpm.commands.install(where, packages, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        } else if (arguments.length === 1) {
            bNpm.commands.install(packages, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        } else {
            reject("bluebird-npm requires at least one argument");
        }
    });
};

bNpm.commands.installAsync.__isPromisified__ = true;

module.exports = bNpm;
