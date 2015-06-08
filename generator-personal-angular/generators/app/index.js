'use strict';


//---------//
// Imports //
//---------//

var generators = require('yeoman-generator')
    , bPromise = require('bluebird')
    , pgc = require('personal-generator-common')
    , bInquirer = require('bluebird-inquirer')
    , path = require('path')
    , toBool = require('boolean')
    , through2 = require('through2')
    , jsBeautify = require('js-beautify').js_beautify;


//------//
// Init //
//------//

var bPrompt = bPromise.promisify(generators.Base.prototype.prompt);
var includeBuddySystemOpt
    , includeHoverIntentOpt
    , angularModuleNameOpt;

//------//
// Main //
//------//

module.exports = generators.Base.extend({
    'constructor': function constructor() {
        generators.Base.apply(this, arguments);

        this.argument('projectName', {
            required: false
        });

        this.option('emptyProjectName', {
            desc: "Set if you want to use the current directory as the project - This option gets around yeoman's unable to pass empty arguments"
                + " via the command line"
        });

        if (this.options.emptyProjectName === true && this.projectName) {
            throw new Error("Invalid State: option emptyProjectName cannot be set while also passing in a projectName argument");
        } else if (this.options.emptyProjectName) {
            this.projectNameArg = "";
        }

        this.option('angularModuleName', {
            desc: "The angular module name (defaults to camelcase'd project name)"
        });
        this.option('includeBuddySystem');
        this.option('includeHoverIntent');

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
                            return (!input.match(/^[a-z][a-zA-Z0-9\.]*$/))
                                ? "Module name must match the following regex: /[a-z][a-zA-Z0-9\.]*/"
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
                includeBuddySystemOpt = toBool(self.options.includeBuddySystem) || (answers.includeBuddySystem === 'y');
                includeHoverIntentOpt = toBool(self.options.includeHoverIntent) || (answers.includeHoverIntent === 'y');
                angularModuleNameOpt = self.options.angularModuleName || answers.angularModuleName;

                if (includeBuddySystemOpt) {
                    self.npmInstall([
                        'buddy-system'
                    ], {
                        'save': true
                    });
                }
                if (includeHoverIntentOpt) {
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

        self.registerTransformStream(
            through2.obj(function(file, enc, cb) {
                if (path.extname(file.path) === '.js') {
                    file.contents = new Buffer(jsBeautify(file.contents.toString()));
                }
                this.push(file);
                cb();
            })
        );

        self.fs.copyTpl(
            self.templatePath("**/*")
            , self.destinationPath()
            , {
                angularModuleName: angularModuleNameOpt
                , includeBuddySystem: includeBuddySystemOpt
                , includeHoverIntent: includeHoverIntentOpt
            }
        );
    }
});
