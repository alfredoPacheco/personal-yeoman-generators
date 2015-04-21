'use strict';


//---------//
// Imports //
//---------//

var ptr = require('promise-task-runner')
    , bPromise = require('bluebird')
    , nh = require('node-helpers')
    , path = require('path')
    , vFs = require('vinyl-fs')
    , bSass = bPromise.promisify(require('node-sass'))
    , http = require('http')
    , bFs = require('fs-bluebird')
    , streamToPromise = require('stream-to-promise')
    , bRimraf = bPromise.promisify(require('rimraf'))
    , bMkdirp = bPromise.promisify(require('mkdirp'))
    , bNcp = bPromise.promisifyAll(require('ncp')).ncp;


//------//
// Init //
//------//

var CSS_DIR = 'css';

var PromiseTask = ptr.PromiseTask
    , PromiseTaskContainer = ptr.PromiseTaskContainer
    , Environment = nh.Environment;

var log = new(nh.LogProvider)()
    .EnvInst(new Environment().HardCoded('dev'))
    .getLogger();

var srcScss = 'src/client/assets/scss';


//------//
// Main //
//------//

var scssClean = new PromiseTask()
    .id('scssClean')
    .task(function() {
        var envInst = new Environment()
            .HardCoded(this.globalArgs().env);

        var cssPath = path.join(process.cwd(), envInst.curEnv(), CSS_DIR);

        return bRimraf(cssPath)
            .then(function() {
                return bMkdirp(cssPath);
            });
    });

var scssBuild = new PromiseTask()
    .id('scssBuild')
    .dependencies(scssClean)
    .task(function() {
        var res;

        var envInst = new Environment()
            .HardCoded(this.globalArgs().env);

        var cssOut = (envInst.isDev())
            ? 'index.css'
            : 'index.min.css';

        var destCss = path.join(envInst.curEnv(), CSS_DIR, cssOut);

        var nodeSassOpts = {
            file: path.join(srcScss, 'index.scss')
        };

        if (!envInst.isProd()) {
            nodeSassOpts.sourceMap = true;
            nodeSassOpts.outFile = cssOut;
        }

        if (envInst.isProd()) {
            nodeSassOpts.outputStyle = 'compressed';
        }

        var bCompileAndCopySass = bSass.render(nodeSassOpts)
            .then(function(successObj) {
                return bMkdirp(path.join(envInst.curEnv(), CSS_DIR))
                    .thenReturn(successObj);
            })
            .then(function(successObj) {
                var pRes;

                if (envInst.isProd()) {
                    pRes = bFs.writeFileAsync(destCss, successObj.css);
                } else {
                    pRes = bPromise.join(
                        bFs.writeFileAsync(destCss, successObj.css)
                        , bFs.writeFileAsync(destCss + '.map', successObj.map)
                    );
                }

                return pRes;
            });

        if (envInst.isProd()) {
            res = bCompileAndCopySass;
        } else {
            res = bPromise.join(
                bCompileAndCopySass
                , bNcp(srcScss, path.join(envInst.curEnv(), CSS_DIR))
            );
        }

        return res;
    });

var scssWatch = new PromiseTask()
    .id('scssWatch')
    .task(function() {
        var envInst = new Environment()
            .HardCoded(this.globalArgs().env);

        var watcher = vFs.watch(path.join(srcScss, "**/*"));
        var cssOut = (envInst.isDev())
            ? 'index.css'
            : 'index.min.css';

        var destCss = path.join(envInst.curEnv(), CSS_DIR, cssOut);
        watcher.on('change', function(fpath) {
            scssBuild.globalArgs({
                    env: envInst.curEnv()
                })
                .run()
                .then(function() {
                    var options = {
                        host: 'localhost'
                        , port: 35729
                        , path: '/changed?files=/' + destCss
                        , agent: false
                    };
                    http.get(options);
                });
        });
    });

//---------//
// Exports //
//---------//

module.exports = (new PromiseTaskContainer()).addTasks(scssClean, scssBuild, scssWatch);
