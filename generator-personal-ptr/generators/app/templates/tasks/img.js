'use strict';


//---------//
// Imports //
//---------//

var ptr = require('promise-task-runner')
    , bPromise = require('bluebird')
    , nh = require('node-helpers')
    , path = require('path')
    , vFs = require('vinyl-fs')
    , http = require('http')
    , streamToPromise = require('stream-to-promise')
    , bRimraf = bPromise.promisify(require('rimraf'))
    , bMkdirp = bPromise.promisify(require('mkdirp'));


//------//
// Init //
//------//

var IMG_DIR = 'img';

var PromiseTask = ptr.PromiseTask
    , PromiseTaskContainer = ptr.PromiseTaskContainer
    , Environment = nh.Environment;

var log = new(nh.LogProvider)()
    .EnvInst(new Environment().HardCoded('dev'))
    .getLogger();

var srcImgs = 'src/client/assets/img';

var lrOptions = {
    host: 'localhost'
    , port: 35729
    , agent: false
};


//------//
// Main //
//------//

var imgClean = new PromiseTask()
    .id('imgClean')
    .task(function() {
        var envInst = new Environment()
            .HardCoded(this.globalArgs().env);

        var imgPath = path.join(process.cwd(), envInst.curEnv(), IMG_DIR);

        return bRimraf(imgPath)
            .then(function() {
                return bMkdirp(imgPath);
            });
    });

var imgBuild = new PromiseTask()
    .id('imgBuild')
    .dependencies(imgClean)
    .task(function() {
        var envInst = new Environment()
            .HardCoded(this.globalArgs().env);

        return streamToPromise(
            vFs.src(path.join(srcImgs, '*'))
            .pipe(vFs.dest(path.join(envInst.curEnv(), IMG_DIR)))
        );
    });

var imgWatch = new PromiseTask()
    .id('imgWatch')
    .task(function() {
        var self = this;
        var envInst = new Environment()
            .HardCoded(self.globalArgs().env);

        var watcher = vFs.watch(path.join(srcImgs, "**/*"));
        var destImg = path.join(envInst.curEnv(), IMG_DIR);

        watcher.on('change', function(fpath) {
            imgBuild
                .globalArgs(self.globalArgs())
                .run()
                .then(function() {
                    lrOptions.path = '/changed?files=/' + path.join(destImg, path.basename(fpath));
                    http.get(lrOptions);
                });
        });
    });


//---------//
// Exports //
//---------//

module.exports = (new PromiseTaskContainer()).addTasks(imgClean, imgBuild, imgWatch);
