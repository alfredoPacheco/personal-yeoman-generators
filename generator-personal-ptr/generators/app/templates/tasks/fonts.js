'use strict';


//---------//
// Imports //
//---------//

var ptr = require('promise-task-runner')
    , bPromise = require('bluebird')
    , http = require('http')
    , nh = require('node-helpers')
    , path = require('path')
    , vFs = require('vinyl-fs')
    , streamToPromise = require('stream-to-promise')
    , bRimraf = bPromise.promisify(require('rimraf'))
    , bMkdirp = bPromise.promisify(require('mkdirp'));


//------//
// Init //
//------//

var FONTS_DIR = 'fonts';

var PromiseTask = ptr.PromiseTask
    , PromiseTaskContainer = ptr.PromiseTaskContainer
    , Environment = nh.Environment;

var log = new(nh.LogProvider)()
    .EnvInst(new Environment().HardCoded('dev'))
    .getLogger();

var srcFonts = 'src/client/assets/fonts';

var lrOptions = {
    host: 'localhost'
    , port: 35729
    , agent: false
};


//------//
// Main //
//------//

var fontsClean = new PromiseTask()
    .id('fontsClean')
    .task(function() {
        var envInst = new Environment()
            .HardCoded(this.globalArgs().env);

        var fontsPath = path.join(process.cwd(), envInst.curEnv(), FONTS_DIR);

        return bRimraf(fontsPath)
            .then(function() {
                return bMkdirp(fontsPath);
            });
    });

var fontsBuild = new PromiseTask()
    .id('fontsBuild')
    .dependencies(fontsClean)
    .task(function() {
        var envInst = new Environment()
            .HardCoded(this.globalArgs().env);

        return streamToPromise(
            vFs.src(path.join(srcFonts, '*'))
            .pipe(vFs.dest(path.join(envInst.curEnv(), FONTS_DIR)))
        );
    });

var fontsWatch = new PromiseTask()
    .id('fontsWatch')
    .task(function() {
        var self = this;
        var envInst = new Environment()
            .HardCoded(self.globalArgs().env);

        var watcher = vFs.watch(srcFonts);
        watcher.on('change', function(fpath) {
            try {
                var changePath = path.join(envInst.curEnv(), FONTS_DIR, path.basename(fpath));
                log.info('changed: ' + changePath);
                fontsBuild
                    .globalArgs(self.globalArgs())
                    .run()
                    .then(function() {
                        lrOptions.path = '/changed?files=/' + changePath;
                        http.get(lrOptions);
                    })
                    .catch(function(err) {
                        log.error(JSON.stringify(err, null, 4));
                    });
            } catch (e) {
                log.error('error happened while building after change communicating to lr');
                log.error(JSON.stringify(e, null, 4));
            }
        });
    });


//---------//
// Exports //
//---------//

module.exports = (new PromiseTaskContainer()).addTasks(fontsClean, fontsBuild, fontsWatch);
