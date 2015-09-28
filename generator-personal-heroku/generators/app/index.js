'use strict';


//---------//
// Imports //
//---------//

var generators = require('yeoman-generator')
    , bInquirer = require('bluebird-inquirer')
    , pgc = require('personal-generator-common')
    , https = require('https')
    , sys = require('sys')
    , exec = require('child_process').exec
    , toBool = require('boolean')
    , path = require('path');


//------//
// Init //
//------//

var herokuAppNameOpt;


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

        this.option('herokuAppName');

        if (!process.env.HEROKU_API_TOKEN) {
            throw new Error("generator-personal-heroku requires the HEROKU_API_TOKEN environment variable to be set");
        }
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
                    'name': 'herokuAppName'
                    , 'message': 'Name of the heroku app?'
                    , 'type': 'input'
                    , 'default': function(answers) {
                            return self.projectNameArg || answers.projectName || path.basename(self.destinationRoot());
                        }
                    , 'when': function() {
                        return typeof self.options.herokuAppName === 'undefined';
                    }
                }
            ])
            .then(function(answers) {
                herokuAppNameOpt = self.options.herokuAppName || answers.herokuAppName;
                done();
            });
    },
    'writing': function writing() {
        var self = this;
        var done = self.async();

        exec("git remote add heroku-prod git@heroku.com:" + herokuAppNameOpt + ".git", {
            cwd: self.destinationRoot()
        }, sysPrint);

        var postData = JSON.stringify({
            name: herokuAppNameOpt
        });

        var options = {
            hostname: 'api.heroku.com'
            , path: '/apps'
            , method: 'POST'
            , headers: {
                'Content-Type': 'application/json'
                , 'Accept': 'application/vnd.heroku+json; version=3'
                , 'Authorization': 'Bearer ' + process.env.HEROKU_API_TOKEN
            }
        };

        var req = https.request(options);

        req.on('error', function(e) {
            throw new Error('heroku app failed to create: ' + e.message);
        });

        req.write(postData);
        req.end(undefined, undefined, done);
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
