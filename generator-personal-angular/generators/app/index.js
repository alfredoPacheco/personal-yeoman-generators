'use strict';


//---------//
// Imports //
//---------//

var generators = require('yeoman-generator')
    , bFs = require('fs-bluebird')
    , bPromise = require('bluebird')
    , pgc = require('personal-generator-common')
    , nh = require('node-helpers')
    , bInquirer = require('bluebird-inquirer')
    , l = require('lambda-js')
    , path = require('path');


//------//
// Init //
//------//

var bPrompt = bPromise.promisify(generators.Base.prototype.prompt);


//------//
// Main //
//------//

module.exports = generators.Base.extend({
    'constructor': function constructor() {
        generators.Base.apply(this, arguments);

        this.argument('projectName', {
            type: String
            , required: false
        });
        this.option('angularModuleName', {
            type: String
            , required: false
            , desc: "The angular module name (defaults to camelcase'd project name)"
        });
        this.option('includeBuddySystem', {
            type: Boolean
            , required: false
        });
        this.option('includeHoverIntent', {
            type: Boolean
            , required: false
        });

        if (arguments[0].length > 2) {
            throw new Error("generator-personal-angular only expects up to two arguments (project name, angular module name).  The following were given: " + arguments[0]);
        }

        this.npmInstall([
            'angular'
            , 'angular-route'
            , 'browserify-shim'
            , 'bunyan'
            , 'jquery'
            , 'lambda-js'
            , 'git://github.com/olsonpm/node-helpers.git'
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
                    'name': 'angularModuleName'
                    , 'message': 'Angular module name (camel-casing with namespacing)'
                    , 'type': 'input'
                    , 'validate': function(input) {
                            return (!input.match(/^[a-z][a-zA-Z\.]*$/))
                                ? "Module name must match the following regex: /[a-z][a-zA-Z\.]*/"
                                : true;
                        }
                    , 'when': function() {
                        return typeof self.options.angularModuleName === 'undefined';
                    }
                }, {
                    'name': 'includeBuddySystem'
                    , 'message': 'Include buddy-system? (y/n)'
                    , 'type': 'list'
                    , 'choices': ['y', 'n']
                    , 'default': 1
                    , 'when': function() {
                        return typeof self.options.includeBuddySystem === 'undefined';
                    }
                }, {
                    'name': 'includeHoverIntent'
                    , 'message': 'Include hoverintent-jqplugin? (y/n)'
                    , 'type': 'list'
                    , 'choices': ['y', 'n']
                    , 'default': 1
                    , 'when': function() {
                        return typeof self.options.includeHoverIntent === 'undefined';
                    }
                }
            ])
            .then(function(answers) {
                if (answers.projectName) {
                    self.destinationRoot(path.join(self.destinationRoot(), answers.projectName));
                }
                self.options.includeBuddySystem = self.options.includeBuddySystem || answers.includeBuddySystem;
                self.options.includeHoverIntent = self.options.includeHoverIntent || answers.includeHoverIntent;
                self.options.angularModuleName = self.options.angularModuleName || answers.angularModuleName;

                if (self.options.includeBuddySystem) {
                    self.npmInstall([
                        'buddy-system'
                    ], {
                        'save': true
                    });
                }
                if (self.options.includeHoverIntent) {
                    self.npmInstall([
                        'hoverintent-jqplugin'
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
                angularModuleName: self.options.angularModuleName
                , includeBuddySystem: self.options.includeBuddySystem
                , includeHoverIntent: self.options.includeHoverIntent
            }
        );
    }
});
