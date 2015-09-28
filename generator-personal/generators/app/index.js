'use strict';

//---------//
// Imports //
//---------//

var generators = require('yeoman-generator')
    , pgc = require('personal-generator-common')
    , bInquirer = require('bluebird-inquirer')
    , l = require('lambda-js')
    , path = require('path')
    , camelcase = require('camelcase')
    , lazy = require('node-helpers').lazyExtensions
    , toBool = require('boolean')
    , through2 = require('through2')
    , jsBeautify = require('js-beautify').js_beautify;


//------//
// Init //
//------//

var argsArray;

require('events').EventEmitter.defaultMaxListeners = 20;


//------//
// Main //
//------//

module.exports = generators.Base.extend({
    'constructor': function constructor() {
        generators.Base.apply(this, arguments);

        if (arguments[0].length > 1) {
            throw new Error("generator-personal only expects up to one parameter (project name).  The following were given: " + arguments[0]);
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
        } else if (this.projectName) {
            this.projectNameArg = this.projectName;
        }

        this.option('angularModuleName', {
            desc: "Sets the angular module name"
        });
        this.option('includeExpress', {
            desc: 'Includes the express framework'
        });
        this.option('includePerfectScrollbar', {
            desc: 'Includes the perfect scrollbar jquery plugin'
        });
        this.option('includeBuddySystem', {
            desc: 'Includes the buddy-system jquery plugin'
        });
        this.option('includeHoverIntent', {
            desc: 'Includes the hover-intent jquery plugin'
        });
        this.option('includeFonts', {
            desc: 'Composes with the fonts generator'
        });
        this.option('includeGit', {
            desc: 'Creates a git repository'
        });
        this.option('includeHeroku', {
            desc: 'Creates a heroku app'
        });
        this.option('includePostgresql', {
            desc: 'Creates a postgresql database and database user with the same name as the project'
        });

        argsArray = (typeof this.projectNameArg !== 'undefined')
            ? [this.projectNameArg]
            : [];
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
                            return (input === '' || (input.match(/^[a-z][a-zA-Z0-9\.]*$/)))
                                ? true
                                : "Module name must be empty or match the following regex: /^[a-z][a-zA-Z0-9\.]*/";
                        }
                    , 'default': function(answers) {
                            return camelcase(self.projectNameArg || answers.projectName || path.basename(self.destinationRoot()));
                        }
                    , 'when': function() {
                        return typeof self.options.angularModuleName === 'undefined';
                    }
                }, {
                    'name': 'includeExpress'
                    , 'message': 'Include express? (y/n)'
                    , 'type': 'list'
                    , 'choices': ['y', 'n']
                    , 'default': 1
                    , 'when': function() {
                        return typeof self.options.includeExpress === 'undefined';
                    }
                }, {
                    'name': 'includePerfectScrollbar'
                    , 'message': 'Include the perfect scrollbar jquery plugin? (y/n)'
                    , 'type': 'list'
                    , 'choices': ['y', 'n']
                    , 'default': 1
                    , 'when': function() {
                        return typeof self.options.includePerfectScrollbar === 'undefined';
                    }
                }, {
                    'name': 'includeBuddySystem'
                    , 'message': 'Include the buddy-system jquery plugin? (y/n)'
                    , 'type': 'list'
                    , 'choices': ['y', 'n']
                    , 'default': 1
                    , 'when': function() {
                        return typeof self.options.includeBuddySystem === 'undefined';
                    }
                }, {
                    'name': 'includeHoverIntent'
                    , 'message': 'Include the hover-intent jquery plugin? (y/n)'
                    , 'type': 'list'
                    , 'choices': ['y', 'n']
                    , 'default': 1
                    , 'when': function() {
                        return typeof self.options.includeHoverIntent === 'undefined';
                    }
                }, {
                    'name': 'includeFonts'
                    , 'message': 'Compose with the fonts generator? (y/n)'
                    , 'type': 'list'
                    , 'choices': ['y', 'n']
                    , 'default': 1
                    , 'when': function() {
                        return typeof self.options.includeFonts === 'undefined';
                    }
                }, {
                    'name': 'includeGit'
                    , 'message': 'Create git repository? (y/n)'
                    , 'type': 'list'
                    , 'choices': ['y', 'n']
                    , 'default': 1
                    , 'when': function() {
                        return typeof self.options.includeGit === 'undefined';
                    }
                }, {
                    'name': 'includeHeroku'
                    , 'message': 'Create heroku app? (y/n)'
                    , 'type': 'list'
                    , 'choices': ['y', 'n']
                    , 'default': 1
                    , 'when': function() {
                        return typeof self.options.includeHeroku === 'undefined';
                    }
                }, {
                    'name': 'includePostgresql'
                    , 'message': 'Create a postgres database? (y/n)'
                    , 'type': 'list'
                    , 'choices': ['y', 'n']
                    , 'default': 1
                    , 'when': function() {
                        return typeof self.options.includePostgresql === 'undefined';
                    }
                }
            ])
            .then(function(answers) {
                if (typeof self.projectNameArg === 'undefined') {
                    argsArray.push(answers.projectName);
                }
                if (answers.projectName) {
                    self.destinationRoot(path.join(self.destinationRoot(), answers.projectName));
                    self.projectNameArg = answers.projectName;
                }
                var angularModuleNameOpt = (self.options.angularModuleName || answers.angularModuleName);
                var includeExpressOpt = toBool(self.options.includeExpress) || (answers.includeExpress === 'y');
                var includePerfectScrollbarOpt = toBool(self.options.includePerfectScrollbar) || (answers.includePerfectScrollbar === 'y');
                var includeBuddySystemOpt = toBool(self.options.includeBuddySystem) || (answers.includeBuddySystem === 'y');
                var includeHoverIntentOpt = toBool(self.options.includeHoverIntent) || (answers.includeHoverIntent === 'y');
                var includeFontsOpt = toBool(self.options.includeFonts) || (answers.includeFonts === 'y');
                var includeGitOpt = toBool(self.options.includeGit) || (answers.includeGit === 'y');
                var includeHerokuOpt = toBool(self.options.includeHeroku) || (answers.includeHeroku === 'y');
                var includePostgresqlOpt = toBool(self.options.includePostgresql) || (answers.includePostgresql === 'y');
                var emptyProjectNameOpt = toBool(self.options.emptyProjectName);
                var skipInstallOpt = toBool(self.options.skipInstall);

                var defaultOptions = lazy({});
                if (emptyProjectNameOpt) {
                    defaultOptions = defaultOptions.extend({
                        emptyProjectName: emptyProjectNameOpt
                    });
                }

                self.composeWith('personal-angular', {
                        args: argsArray
                        , options: defaultOptions.extend({
                            angularModuleName: angularModuleNameOpt
                            , includeBuddySystem: includeBuddySystemOpt
                            , includeHoverIntent: includeHoverIntentOpt
                            , skipInstall: skipInstallOpt
                        }).toObject()
                    }
                    , {
                        local: require.resolve('generator-personal-angular')
                    });
                self.composeWith('personal-express', {
                        args: argsArray
                        , options: defaultOptions.extend({
                            skipInstall: skipInstallOpt
                        }).toObject()
                    }
                    , {
                        local: require.resolve('generator-personal-express')
                    });
                if (includeFontsOpt) {
                    self.composeWith('personal-fonts', {
                            args: argsArray
                            , options: defaultOptions.toObject()
                        }
                        , {
                            local: require.resolve('generator-personal-fonts')
                        });
                }

                self.composeWith('personal-javascript-libs', {
                        args: argsArray
                        , options: defaultOptions.extend({
                            perfectScrollbar: includePerfectScrollbarOpt
                            , buddySystem: includeBuddySystemOpt
                            , hoverIntent: includeHoverIntentOpt
                            , skipInstall: skipInstallOpt
                        }).toObject()
                    }
                    , {
                        local: require.resolve('generator-personal-javascript-libs')
                    });

                self.composeWith('personal-pjson', {
                        args: argsArray
                        , options: defaultOptions.extend({
                            includeAngular: angularModuleNameOpt
                        }).toObject()
                    }
                    , {
                        local: require.resolve('generator-personal-pjson')
                    });

                self.composeWith('personal-ptr', {
                        args: argsArray
                        , options: defaultOptions.extend({
                            includeExpress: includeExpressOpt
                            , includeAngular: true
                            , angularModuleName: angularModuleNameOpt
                            , skipInstall: skipInstallOpt
                        }).toObject()
                    }
                    , {
                        local: require.resolve('generator-personal-ptr')
                    });

                self.composeWith('personal-scss', {
                        args: argsArray
                        , options: defaultOptions.extend({
                            includePerfectScrollbar: includePerfectScrollbarOpt
                            , includeFonts: includeFontsOpt
                            , skipInstall: skipInstallOpt
                        }).toObject()
                    }
                    , {
                        local: require.resolve('generator-personal-scss')
                    });

                if (includeGitOpt) {
                    self.composeWith('personal-git', {
                            args: argsArray
                            , options: defaultOptions.extend({
                                repoName: self.projectNameArg || path.basename(self.destinationRoot())
                                , includePostgresql: includePostgresqlOpt
                            }).toObject()
                        }
                        , {
                            local: require.resolve('generator-personal-git')
                        });
                }

                if (includeHerokuOpt) {
                    self.composeWith('personal-heroku', {
                            args: argsArray
                            , options: defaultOptions.extend({
                                herokuAppName: self.projectNameArg || path.basename(self.destinationRoot())
                            }).toObject()
                        }
                        , {
                            local: require.resolve('generator-personal-heroku')
                        });
                }

                if (includePostgresqlOpt) {
                    self.composeWith('personal-postgresql', {
                            args: argsArray
                            , options: defaultOptions.extend({
                                dbName: (self.projectNameArg || path.basename(self.destinationRoot())).replace(/-/g, '_')
                                , includeHeroku: includeHerokuOpt
                                    // since both the git and postgres generators are expected to add the postgresql gitignore entries,
                                    //  we will let the git generator handle this
                                , includeGit: false
                                , skipInstall: skipInstallOpt
                            }).toObject()
                        }
                        , {
                            local: require.resolve('generator-personal-postgresql')
                        });
                }

                // small hack to get transfomers working


                done();
            });
    }, 'writing': function writing() {
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
    }
});
