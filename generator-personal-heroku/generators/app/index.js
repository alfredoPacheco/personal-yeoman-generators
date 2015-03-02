'use strict';


//---------//
// Imports //
//---------//

var generators = require('yeoman-generator')
    , bInquirer = require('bluebird-inquirer')
    , pgc = require('personal-generator-common')
    , https = require('https');


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
            type: String
            , required: false
        });
        this.option('herokuAppName', {
            type: String
            , required: false
        });

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

        return bInquirer.prompt([
                pname.getPrompt() // only prompts if a project name wasn't passed in via arguments
                , {
                    'name': 'herokuAppName'
                    , 'message': 'Name of the heroku app?'
                    , 'type': 'input'
                    , 'default': function(answers) {
                            return self.projectName || answers.projectName;
                        }
                    , 'when': function() {
                        return typeof self.options.herokuAppName === 'undefined';
                    }
                }
            ])
            .then(function(answers) {
                self.options.herokuAppName = self.options.herokuAppName || answers.herokuAppName;
                done();
            });
    },
    'writing': function writing() {
        var self = this;
        var done = self.async();

        var postData = JSON.stringify({
            name: self.options.herokuAppName
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
