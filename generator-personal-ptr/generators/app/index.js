'use strict';


//---------//
// Imports //
//---------//

var generators = require('yeoman-generator')
    , pgc = require('personal-generator-common')
    , path = require('path')
    , bPromise = require('bluebird')
    , bInquirer = require('bluebird-inquirer')
    , l = require('lambda-js');


//------//
// Init //
//------//

var TASKS_DIR_DEFAULT = 'tasks';


//------//
// Main //
//------//

module.exports = generators.Base.extend({
    'constructor': function constructor() {
        generators.Base.apply(this, arguments);
        if (arguments[0].length > 3) {
            throw new Error("generator-personal-ptr only expects up to three arguments (project name, task dir).  The following were given: " + arguments[0]);
        }
        this.argument('projectName', {
            type: String, required: false
        });
        this.argument('taskDir', {
            type: String, required: false
        });
        this.option('includeExpress', {
            type: Boolean
            , required: false
        });
        this.option('angularModuleName', {
            type: String
            , required: false
        });
        this.taskDir = this.taskDir || TASKS_DIR_DEFAULT;

        this.npmInstall([
            'bluebird'
            , 'browserify'
            , 'fs-bluebird'
            , 'gulp-angular-templatecache'
            , 'mkdirp'
            , 'ncp'
            , 'stream-to-promise'
            , 'through2'
            , 'rimraf'
            , 'tiny-lr'
            , 'minifyify'
            , 'vinyl-fs'
            , 'vinyl-source-stream'
            , 'vinyl-transform'
            , 'git://github.com/olsonpm/node-helpers.git'
            , 'git://github.com/sass/node-sass.git'
            , 'git://github.com/olsonpm/promise-task-runner.git'
        ], {
            'save': true
        });
    },
    'prompting': function prompting() {
        var self = this;
        var done = self.async();

        // needed to use project name in multiple generators. The below just initializes the project name, if passed,
        //   by setting our destinationRoot to it plus runs it through a validator.
        var pname = new pgc.ProjectNameState(self);

        bInquirer.prompt([
            pname.getPrompt() // only prompts if a project name wasn't passed in via arguments
            , {
                'name': 'includeExpress'
                , 'message': 'Include express? (y/n)'
                , 'type': 'list'
                , 'choices': ['y', 'n']
                , 'default': 1
                , 'when': function() {
                    return typeof self.options.includeExpress === 'undefined';
                }
            }, {
                'name': 'angularModuleName'
                , 'message': 'If using angular, type the module name (camel-casing with namespacing)'
                , 'type': 'input'
                , 'validate': function(input) {
                        if (input === '') return true;

                        return (input === '' || input.match(/^[a-z][a-zA-Z0-9\.]*$/))
                            ? true
                            : "Module name must match the following regex: /[a-z][a-zA-Z0-9\.]*/";
                    }
                , 'when': function() {
                    return typeof self.options.angularModuleName === 'undefined';
                }
            }
        ]).then(function(answers) {
            if (answers.projectName) {
                self.destinationRoot(path.join(self.destinationRoot(), answers.projectName));
            }
            self.options.includeExpress = self.options.includeExpress || answers.includeExpress;
            self.options.angularModuleName = self.options.angularModuleName || answers.angularModuleName;

            if (self.options.includeExpress === 'y') {
                self.npmInstall([
                    'compression'
                    , 'express'
                ], {
                    'save': true
                });
            }
            done();
        });
    },
    'writing': function writing() {
        var self = this;

        self.fs.copyTpl(
            self.templatePath("**/*")
            , self.destinationPath()
            , {
                includeExpress: self.options.includeExpress
                , angularModuleName: self.options.angularModuleName
                , projectNameEnv: path.basename(self.destinationRoot()).toUpperCase().replace(/-/g, "_") + "_NODE_ENV"
            }
        );
    }
});
