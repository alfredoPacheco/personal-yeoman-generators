'use strict';


//---------//
// Imports //
//---------//

var generators = require('yeoman-generator')
    , bPromise = require('bluebird')
    , pgc = require('personal-generator-common')
    , nh = require('node-helpers')
    , bInquirer = require('bluebird-inquirer')
    , path = require('path')
    , l = require('lambda-js')
    , toBool = require('boolean');


//------//
// Init //
//------//

var bPrompt = bPromise.promisify(generators.Base.prototype.prompt);
var lazy = nh.lazyExtensions;

var promptAnswers
    , includeFontsOpt
    , includePerfectScrollbarOpt
    , skipInstallOpt;


//------//
// Main //
//------//

module.exports = generators.Base.extend({
    'constructor': function constructor() {
        generators.Base.apply(this, arguments);

        this.argument('projectName', {
            required: false
        });
        this.projectNameArg = this.projectName;

        this.option('emptyProjectName', {
            desc: "Set if you want to use the current directory as the project - This option gets around yeoman's unable to pass empty arguments"
                + " via the command line"
        });
        if (this.options.emptyProjectName === true && this.projectName) {
            throw new Error("Invalid State: option emptyProjectName cannot be set while also passing in a projectName argument");
        } else if (this.options.emptyProjectName) {
            this.projectNameArg = "";
        }

        this.option('includePerfectScrollbar');
        this.option('includeFonts');

        if (arguments[0].length > 2) {
            throw new Error("generator-personal-scss only expects up to two arguments (project name, include perfect scrollbar).  The following were given: " + arguments[0]);
        }

        this.option('skipInstall');
        skipInstallOpt = toBool(this.options.skipInstall);
        var shouldInstall = !skipInstallOpt;

        if (shouldInstall) {
            this.npmInstall([
                'git://github.com/olsonpm/normalize.scss.git'
            ], {
                'save': true
            });
        }
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
                    'name': 'includePerfectScrollbar'
                    , 'message': 'Include perfect scrollbar?'
                    , 'type': 'list'
                    , 'choices': ['y', 'n']
                    , 'default': 1
                    , 'when': function() {
                        return typeof self.options.includePerfectScrollbar === 'undefined';
                    }
                }
                , {
                    'name': 'includeFonts'
                    , 'message': 'Are fonts included?'
                    , 'type': 'list'
                    , 'choices': ['y', 'n']
                    , 'default': 1
                    , 'when': function() {
                        return typeof self.options.includeFonts === 'undefined';
                    }
                }
            ])
            .then(function(answers) {
                if (answers.projectName) {
                    self.destinationRoot(path.join(self.destinationRoot(), answers.projectName));
                }

                includeFontsOpt = toBool(self.options.includeFonts) || (answers.includeFonts === 'y');
                includePerfectScrollbarOpt = toBool(self.options.includePerfectScrollbar) || (answers.includePerfectScrollbar === 'y');

                if (includePerfectScrollbarOpt) {
                    self.npmInstall([
                        'git://github.com/noraesae/perfect-scrollbar.git'
                    ], {
                        'save': true
                    });
                }

                done();
            });
    },
    'writing': function writing() {
        var self = this;

        var includeGlob = "**/*";
        if (!this.options.includePerfectScrollbar) {
            includeGlob += "!(_perfect-scrollbar-override.scss)";
        }

        self.fs.copyTpl(
            self.templatePath(includeGlob)
            , self.destinationPath()
            , {
                includePerfectScrollbar: includePerfectScrollbarOpt
                , includeFonts: includeFontsOpt
            }
        );
    }
});
