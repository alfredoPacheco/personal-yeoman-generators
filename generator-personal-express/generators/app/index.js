'use strict';


//---------//
// Imports //
//---------//

var generators = require('yeoman-generator')
    , bPromise = require('bluebird')
    , pgc = require('personal-generator-common')
    , bInquirer = require('bluebird-inquirer')
    , path = require('path');


//------//
// Init //
//------//

var bPrompt = bPromise.promisify(generators.Base.prototype.prompt);
var promptAnswers;


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

        if (arguments[0].length > 1) {
            throw new Error("generator-personal-express only expects up to one argument (project name).  The following were given: " + arguments[0]);
        }

        this.npmInstall([
            'express'
            , 'compression'
            , 'lambda-js'
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
                pname.getPrompt()
            ]) // only prompts if a project name wasn't passed in via arguments
            .then(function(answers) {
                if (answers.projectName) {
                    self.destinationRoot(path.join(self.destinationRoot(), answers.projectName));
                }
                done();
            });
    },
    'writing': function writing() {
        var self = this;

        self.fs.copy(
            self.templatePath("**/*")
            , self.destinationPath()
        );
    }
});
