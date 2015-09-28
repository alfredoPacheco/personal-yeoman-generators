'use strict';


//---------//
// Imports //
//---------//

var generators = require('yeoman-generator')
    , bPromise = require('bluebird')
    , bInquirer = require('bluebird-inquirer')
    , pgc = require('personal-generator-common')
    , sys = require('sys')
    , bExec = bPromise.promisify(require('child_process').exec)
    , lazy = require('node-helpers').lazyExtensions
    , toBool = require('boolean')
    , path = require('path')
    , bTouch = bPromise.promisify(require('touch'));


//------//
// Init //
//------//

var dbNameOpt
    , includeHerokuOpt
    , dropExistingDatabaseOpt
    , includeGitOpt
    , skipInstallOpt;


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

        this.option('dbName');
        this.option('includeHeroku');
        this.option('dropExistingDatabase');

        if (!process.env.HEROKU_API_TOKEN) {
            throw new Error("generator-personal-heroku requires the HEROKU_API_TOKEN environment variable to be set");
        }

        this.option('skipInstall');
        skipInstallOpt = toBool(this.options.skipInstall);
        var shouldInstall = !skipInstallOpt;

        if (shouldInstall) {
            this.npmInstall([
                'mocha'
                , 'chai'
                , 'git://github.com/olsonpm/node-helpers.git'
            ], {
                'save': true
            });
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
                    'name': 'dbName'
                    , 'message': 'Name of the database?'
                    , 'type': 'input'
                    , 'default': function(answers) {
                            var tmpName = self.projectNameArg || answers.projectName || path.basename(self.destinationRoot());
                            return tmpName.toLowerCase().replace(/-/g, '_');
                        }
                    , 'when': function() {
                        return typeof self.options.dbName === 'undefined';
                    }
                }, {
                    'name': 'includeHeroku'
                    , 'message': 'Is this a heroku app? (y/n)'
                    , 'type': 'list'
                    , 'choices': ['y', 'n']
                    , 'default': 1
                    , 'when': function() {
                        return typeof self.options.includeHeroku === 'undefined';
                    }
                }, {
                    'name': 'includeGit'
                    , 'message': 'Is this a git repository? (y/n)'
                    , 'type': 'list'
                    , 'choices': ['y', 'n']
                    , 'default': 1
                    , 'when': function() {
                        return typeof self.options.includeGit === 'undefined';
                    }
                }, {
                    'name': 'dropExistingDatabase'
                    , 'message': function(answers) {
                        return "Database name: '" + answers.dbName + "' already exists.  Delete it?";
                    }, 'type': 'list'
                    , 'choices': ['y', 'n']
                    , 'default': 1
                    , 'when': function(answers) {
                        var done = this.async();
                        var shouldPrompt = (typeof self.options.dropExistingDatabase === 'undefined');

                        var bShouldPrompt = (shouldPrompt)
                            ? bPromise.try(function() {
                                var cmd = 'psql postgres -tAc "SELECT 1 FROM pg_database WHERE datistemplate = false '
                                    + 'AND datname=' + "'" + answers.dbName + "'" + '" | grep 1';

                                return bExec(cmd);
                            })
                            .catch(function(err) {
                                if (err.code != 1) {
                                    throw err;
                                }
                                return ["", ""];
                            })
                            .spread(function(stdoutBuf, stderrBuf) {
                                if (stderrBuf) {
                                    throw new Error(stderrBuf);
                                }

                                shouldPrompt = stdoutBuf.length > 0;
                                return shouldPrompt;
                            })
                            : bPromise.resolve(shouldPrompt);

                        return bShouldPrompt.then(function(shouldPrompt) {
                            done(shouldPrompt);
                        });
                    }
                }
            ])
            .then(function(answers) {
                dbNameOpt = self.options.dbName || answers.dbName;
                includeHerokuOpt = toBool(self.options.includeHeroku) || (answers.includeHeroku === 'y');
                dropExistingDatabaseOpt = toBool(self.options.dropExistingDatabase) || (answers.dropExistingDatabase === 'y');
                includeGitOpt = toBool(self.options.includeGit) || (answers.includeGit === 'y');
                done();
            });
    },
    'writing': function writing() {
        var self = this;
        var done = self.async();

        var filesToIgnore = 'db/data-backups';
        var gitignore = '.gitignore';
        if (includeGitOpt) {
            if (self.fs.exists('.gitignore')) {
                var gitignoreContents = self.fs.read('.gitignore');
                var lazyLines = lazy(gitignoreContents.split("\n"));
                if (!lazyLines.has(filesToIgnore)) {
                    self.fs.append(gitignore, filesToIgnore);
                }
            } else {
                self.fs.write(gitignore, filesToIgnore);
            }
        }

        var handleDb = bPromise.all([
                createDbUserIfNotExists(dbNameOpt)
                , createDbUserIfNotExists(dbNameOpt + '_test')
            ])
            .then(function() {
                var bRes;
                if (dropExistingDatabaseOpt) {
                    bRes = bPromise.all(
                        dropDb(dbNameOpt)
                        , dropDb(dbNameOpt + '_test')
                    );
                }

                return bRes;
            })
            .then(function() {
                return bPromise.all([
                    createDb(dbNameOpt)
                    , createDb(dbNameOpt + '_test')
                ]);
            });

        handleDb.then(function() {
            writeTemplate();
            done();
        });

        function createDbUserIfNotExists(username) {
            return bExec('psql postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname=' + "'" + username + "'" + '" | grep -q 1 || createuser ' + username);
        }

        function createDb(dbName) {
            return bExec("psql -c \"CREATE DATABASE " + dbName + " with owner = " + process.env.USER + "\"", {
                    cwd: self.destinationRoot()
                })
                .then(function() {
                    return bExec("psql -d \"" + dbName + "\" -c \""
                        + "alter default privileges in schema public grant select, insert, update, delete on tables to " + dbName + "\"", {
                            cwd: self.destinationRoot()
                        });

                })
                .then(function() {
                    return bExec("psql -d \"" + dbName + "\" -c \""
                        + "alter default privileges in schema public grant select, update on sequences to " + dbName + "\"", {
                            cwd: self.destinationRoot()
                        });
                });
        }

        function dropDb(dbName) {
            return bExec("psql -c \"DROP DATABASE IF EXISTS " + dbName + "\"", {
                cwd: self.destinationRoot()
            });
        }

        function writeTemplate() {
            var options = lazy({
                interpolate: /<%=([\s\S]+?)%>/g
            });

            if (!includeHerokuOpt) {
                options.extend({
                    ignore: "db/build-heroku-db.sh"
                });
            }

            self.fs.copyTpl(
                self.templatePath("**/*")
                , self.destinationPath()
                , {
                    dbName: dbNameOpt
                }, options.toObject()
            );
        }
    }
});
