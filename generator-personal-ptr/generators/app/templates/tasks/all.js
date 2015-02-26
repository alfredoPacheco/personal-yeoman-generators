'use strict';


//---------//
// Imports //
//---------//

<% if (includeExpress) { %>
    // generated imports
    var compression = require('compression');
    var express = require('express'); <%
} %>

var ptr = require('promise-task-runner')
    , addRoutes = require('../src/server/routes.js')
    , bPromise = require('bluebird')
    , http = require('http')
    , nh = require('node-helpers')
    , path = require('path')
    , streamToPromise = require('stream-to-promise')
    , through2 = require('through2')
    , tinyLr = require('tiny-lr')
    , vFs = require('vinyl-fs')
    , vTransform = require('vinyl-transform')
    , bRimraf = bPromise.promisify(require('rimraf'))
    , bMkdirp = bPromise.promisify(require('mkdirp'));


//------//
// Init //
//------//

var PromiseTask = ptr.PromiseTask
    , TaskDependency = ptr.TaskDependency
    , PromiseTaskContainer = ptr.PromiseTaskContainer
    , Environment = nh.Environment
    , lazy = nh.lazyExtensions;

var srcHtml = 'src/client/index.html';
var ENVIRONMENT_VARIABLE_DEPENDENCIES = [];
var addRoutes = require('../src/server/routes');
var lrOptions = {
    host: 'localhost'
    , port: 35729
    , path: '/changed?files=/index.html'
    , agent: false
};

//------//
// Main //
//------//

var allTasks = new PromiseTaskContainer()
    .gatherContainers(
        require('./fonts')
        , require('./img')
        , require('./js')
        , require('./scss')
    );

var clean = new PromiseTask()
    .id('clean')
    .task(function() {
        var env = new Environment({
            hardCoded: this.globalArgs().env
        });
        var envPath = path.join(process.cwd(), env.curEnv());
        return bRimraf(envPath)
            .then(function() {
                return bMkdirp(envPath);
            });
    });

var cleanThenBuildAll = new TaskDependency()
    .id('cleanThenBuildAll')
    .task(function() {
        return clean.run()
            .then(function() {
                return bPromise.all([
                    allTasks.getTask('fontsBuild').run()
                    , allTasks.getTask('imgBuild').run()
                    , allTasks.getTask('jsBuild').run()
                    , allTasks.getTask('scssBuild').run()
                ]);
            });

    });

var build = new PromiseTask()
    .id('build')
    .dependencies(cleanThenBuildAll)
    .task(function() {
        var env = new Environment({
            hardCoded: this.globalArgs().env
        });
        return streamToPromise(
            vFs.src(srcHtml)
            .pipe(injector(env))
            .pipe(vFs.dest(env.curEnv()))
        );
    });

var htmlWatch = new PromiseTask()
    .id('htmlWatch')
    .task(function() {
        var self = this;
        var env = new Environment({
            hardCoded: self.globalArgs().env
        });
        var watcher = vFs.watch(srcHtml);
        watcher.on('change', function(fpath) {
            try {
                build
                    .globalArgs(self.globalArgs())
                    .run()
                    .then(function() {
                        http.get(lrOptions);
                    })
                    .catch(function(err) {
                        console.log('%j', err);
                    });
            } catch (e) {
                console.log('error happened while building after change communicating to lr');
                console.log('%j', e);
            }
        });
    });

var watchAll = new PromiseTask()
    .id('watchAll')
    .task(function() {
        htmlWatch.run();
        allTasks.getTask('fontsWatch').run();
        allTasks.getTask('imgWatch').run();
        allTasks.getTask('jsWatch').run();
        allTasks.getTask('scssWatch').run();
    });


<% if (includeExpress) { %>
    var startServer = new PromiseTask()
        .id('startServer')
        .task(function() {
            var env = new Environment({
                hardCoded: this.globalArgs().env
            });
            checkEnvVars();

            var app = express();
            app.use(compression());

            app.use(express.static(path.join(env.curEnv())));

            addRoutes(app, env.curEnv(), process.cwd());

            var port = process.env.PORT || 5000;
            app.listen(port);
            console.log("" + env.curEnv() + " server listening on port " + port);
        });

    var buildThenStartServer = new PromiseTask()
        .id('buildThenStartServer')
        .task(function() {
            var self = this;
            var env = new Environment({
                hardCoded: this.globalArgs().env
            });

            return build
                .globalArgs(self.globalArgs())
                .run()
                .then(function() {
                    return startServer
                        .globalArgs(self.globalArgs())
                        .run();
                });
        }); <%
} %>

var startLr = new PromiseTask()
    .id('startLr')
    .task(function() {
        var port = 35729;
        tinyLr().listen(port, function() {
            console.log('Listening on port: %s ', port);
        });
    });

//-------------//
// Helper Fxns //
//-------------//

function injector(env) {
    var curEnv = env.curEnv();
    return new vTransform(function(filename) {
        var cssInject = "<!-- inject:css -->";
        var jsInject = "<!-- inject:js -->";
        var endInject = "<!-- endinject -->";

        var indexCssRel = env.isProd()
            ? "css/index.min.css"
            : "css/index.css";

        var indexJsRel = env.isProd()
            ? "index.min.js"
            : "index.js";

        var indexCssOut = path.join(curEnv, indexCssRel);
        var indexJsOut = path.join(curEnv, indexJsRel);
        var injectedCss = '<link rel="stylesheet" type="text/css" href="' + indexCssRel + '">';
        var injectedJs = '<script src="' + indexJsRel + '"></script>';

        // (.|[\n\r])*? matches any character including newlines
        var css_regex = new RegExp(escapeRegExp(cssInject) + "(.|[\n\r])*?" + escapeRegExp(endInject));
        var js_regex = new RegExp(escapeRegExp(jsInject) + "(.|[\n\r])*?" + escapeRegExp(endInject));

        return through2.obj(function(chunk, enc, cb) {
            chunk = chunk.toString().replace(css_regex, injectedCss)
                .replace(js_regex, injectedJs);
            cb(null, chunk);
        });
    });
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function checkEnvVars() {
    var undefinedEnvVars = [];
    ENVIRONMENT_VARIABLE_DEPENDENCIES.forEach(function(e) {
        if (typeof process.env[e] === 'undefined') {
            undefinedEnvVars.push(e);
        }
    });
    if (undefinedEnvVars.length > 0) {
        throw new Error("Invalid State: The following environment variable must be declared\n" + undefinedEnvVars);
    }
}


//---------//
// Exports //
//---------//

<% if (includeExpress) { %>
    module.exports = (new PromiseTaskContainer()).addTasks(clean, build, htmlWatch, watchAll, startLr, startServer, buildThenStartServer); <%
} else { %>
    module.exports = (new PromiseTaskContainer()).addTasks(clean, build, htmlWatch, watchAll, startLr); <%
} %>
