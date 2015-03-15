'use strict';


//---------//
// Imports //
//---------//

var generators = require('yeoman-generator')
    , bPromise = require('bluebird')
    , bInquirer = require('bluebird-inquirer')
    , pgc = require('personal-generator-common')
    , sys = require('sys')
    , bExec = bPromise.promisify(require('child_process').exec);


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
        this.option('dbName', {
            type: String
            , required: false
        });

        if (!process.env.HEROKU_API_TOKEN) {
            throw new Error("generator-personal-heroku requires the HEROKU_API_TOKEN environment variable to be set");
        }

        this.npmInstall([
            'mocha'
            , 'mocha-clean'
            , 'chai'
            , 'git://github.com/olsonpm/node-helpers.git'
        ], {
            'save': true
        });
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
                    'name': 'dbName'
                    , 'message': 'Name of the database?'
                    , 'type': 'input'
                    , 'default': function(answers) {
                            var tmpName = self.projectName || answers.projectName;
                            return tmpName.replace(/-/g, '_');
                        }
                    , 'when': function() {
                        return typeof self.options.dbName === 'undefined';
                    }
                }
            ])
            .then(function(answers) {
                self.options.dbName = self.options.dbName || answers.dbName;
                done();
            });
    },
    'writing': function writing() {
        var self = this;
        var done = self.async();

        function createDbUserIfNotExists(username) {
            return bExec('psql postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname=' + username + '" | grep -q 1 || createuser ' + username);
        }

        function createDb(dbName) {
            return bExec("psql -c \"CREATE DATABASE " + dbName + " with owner = " + process.env.USER + "\"", {
                    cwd: self.destinationRoot()
                })
                .then(function() {
                    return bExec("psql -c \"grant select, insert, update, delete on all tables in schema public to " + dbName
                        + "; grant select, update on all sequences in schema public to " + dbName + "\"", {
                            cwd: self.destinationRoot()
                        })
                });
        }

        function writeTemplate() {
            self.fs.copyTpl(
                self.templatePath("**/*")
                , self.destinationPath()
                , {
                    dbName: self.options.dbName
                }, {
                    interpolate: /<%=([\s\S]+?)%>/g
                }
            );
        }

        bPromise.all([
                createDbUserIfNotExists(self.options.dbName)
                , createDbUserIfNotExists(self.options.dbName + '_test')
            ])
            .then(function() {
                return bPromise.all([
                    createDb(self.options.dbName)
                    , createDb(self.options.dbName + '_test')
                ]);
            })
            .then(function() {
                writeTemplate();
                done();
            });
    }
});
