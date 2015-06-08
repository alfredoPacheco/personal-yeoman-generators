'use strict';


//---------//
// Imports //
//---------//

var generators = require('yeoman-generator')
    , bInquirer = require('bluebird-inquirer')
    , pgc = require('personal-generator-common')
    , GitHubAPI = require('github')
    , sys = require('sys')
    , exec = require('child_process').exec;


//------//
// Init //
//------//

var github = new GitHubAPI({
    version: "3.0.0"
});

github.authenticate({
    type: "oauth",
    token: process.env.GIT_API_TOKEN
});

var repoNameOpt;


//------//
// Main //
//------//

module.exports = generators.Base.extend({
    'constructor': function constructor() {
        generators.Base.apply(this, arguments);
        if (arguments[0].length > 1) {
            throw new Error("generator-personal-pjson only expects up to one parameter (project name).  The following were given: " + arguments[0]);
        }
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

        this.option('repoName');
    },
    'prompting': function prompting() {
        var self = this;
        var done = self.async();

        // needed to use project name in multiple generators. The below just initializes the project name by setting our destinationRoot to it
        //   plus runs it through a validator.
        var pname = new pgc.ProjectNameState(self);

        bInquirer.prompt([
                pname.getPrompt() // only prompts if a project name wasn't passed in via arguments
                , {
                    'name': 'repoName'
                    , 'message': 'Name of the repository?'
                    , 'type': 'input'
                    , 'default': function(answers) {
                            return self.projectNameArg || answers.projectName || path.basename(self.destinationRoot());
                        }
                    , 'when': function() {
                        return typeof self.options.repoName === 'undefined';
                    }
                }
            ])
            .then(function(answers) {
                repoNameOpt = self.options.repoName || answers.repoName;

                github.repos.create({
                    name: repoNameOpt
                }, done);
            });
    },
    'writing': function writing() {
        var self = this;

        exec("git init", {
            cwd: self.destinationRoot()
        }, sysPrint);
        exec("git remote add origin 'git@github.com:olsonpm/" + repoNameOpt + ".git'", {
            cwd: self.destinationRoot()
        }, sysPrint);
        self.fs.write('.gitignore', 'node_modules\nnpm-debug.log');
    }
});


//------------------//
// Helper Functions //
//------------------//

function sysPrint(error, stdout, stderr) {
    var errs = [];
    if (error !== null) {
        errs.push('Runtime Error: git command caused an error: ' + error);
    }
    if (stderr) {
        errs.push('Runtime Error: git command caused stderr: ' + stderr);
    }
    if (errs.length > 0) {
        throw new Error(errs.join('\n'));
    }
}
