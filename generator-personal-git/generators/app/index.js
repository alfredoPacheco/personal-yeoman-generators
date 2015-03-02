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
            type: String, required: false
        });
        this.option('repoName', {
            type: String
            , required: false
        });
    },
    'prompting': function prompting() {
        var self = this;
        var done = self.async();

        // needed to use project name in multiple generators. The below just initializes the project name by setting our destinationRoot to it
        //   plus runs it through a validator.
        var pname = new pgc.ProjectNameState(self);

        return bInquirer.prompt([
                pname.getPrompt() // only prompts if a project name wasn't passed in via arguments
                , {
                    'name': 'repoName'
                    , 'message': 'Name of the repository?'
                    , 'type': 'input'
                    , 'default': function(answers) {
                            return self.projectName || answers.projectName;
                        }
                    , 'when': function() {
                        return typeof self.options.repoName === 'undefined';
                    }
                }
            ])
            .then(function(answers) {
                self.options.repoName = self.options.repoName || answers.repoName;

                github.repos.create({
                    name: self.options.repoName
                }, done);
            });
    },
    'writing': function writing() {
        var self = this;

        exec("git init", {
            cwd: self.destinationRoot()
        }, sysPrint);
        exec("git remote add origin 'git@github.com:olsonpm/" + self.options.repoName + ".git'", {
            cwd: self.destinationRoot()
        }, sysPrint);
        self.fs.write('.gitignore', 'node_modules\nnpm-debug.log');
    }
});


//------------------//
// Helper Functions //
//------------------//

function sysPrint(error, stdout, stderr) {
    sys.print('stdout: ' + stdout);
    sys.print('stderr: ' + stderr);
    if (error !== null) {
        console.log('exec error: ' + error);
    }
    sys.puts(stdout);
}
