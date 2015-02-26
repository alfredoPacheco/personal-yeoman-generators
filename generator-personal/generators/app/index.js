'use strict';

//---------//
// Imports //
//---------//

var generators = require('yeoman-generator')
    , pgd = require('personal-generator-common')
    , bInquirer = require('bluebird-inquirer')
    , l = require('lambda-js')
    , path = require('path')
    , camelcase = require('camelcase');


//------//
// Init //
//------//

var argsArray;


//------//
// Main //
//------//

module.exports = generators.Base.extend({
    'constructor': function constructor() {
        generators.Base.apply(this, arguments);

        if (arguments[0].length > 1) {
            throw new Error("generator-personal-base only expects up to one parameter (project name).  The following were given: " + arguments[0]);
        }
        this.argument('projectName', {
            type: String
            , required: false
        });
        this.option('angularModuleName', {
            type: String
            , required: false
            , desc: "The angular module name"
        });
        this.option('includeExpress', {
            required: false
            , desc: 'Includes the express framework'
        });
        this.option('includePerfectScrollbar', {
            required: false
            , desc: 'Includes the perfect scrollbar jquery plugin'
        });
        this.option('includeBuddySystem', {
            required: false
            , desc: 'Includes the buddy-system jquery plugin'
        });
        this.option('includeHoverIntent', {
            required: false
            , desc: 'Includes the hover-intent jquery plugin'
        });
        this.option('includeFonts', {
            required: false
            , desc: 'Composes with the fonts generator'
        });
        argsArray = (this.projectName)
            ? [this.projectName]
            : [];
    },
    'prompting': function prompting() {
        var self = this;
        var done = self.async();

        // needed to use project name in multiple generators. The below just initializes the project name, if passed,
        //   by setting our destinationRoot to it plus runs it through a validator.
        var pname = new pgd.ProjectNameState(self);

        bInquirer.prompt([
                pname.getPrompt() // only prompts if a project name wasn't passed in via arguments
                , {
                    'name': 'angularModuleName'
                    , 'message': 'Angular module name (camel-casing with namespacing)'
                    , 'type': 'input'
                    , 'validate': function(input) {
                            return (input === '' || (input.match(/^[a-z][a-zA-Z\.]*$/)))
                                ? true
                                : "Module name must be empty or match the following regex: /^[a-z][a-zA-Z\.]*/";
                        }
                    , 'default': function(answers) {
                            return camelcase(self.projectName || answers.projectName);
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
                }
            ])
            .then(function(answers) {
                if (answers.projectName) {
                    self.destinationRoot(path.join(self.destinationRoot(), answers.projectName));
                    argsArray.push(answers.projectName);
                }
                self.options.angularModuleName = self.options.angularModuleName || answers.angularModuleName;
                self.options.includeExpress = self.options.includeExpress || answers.includeExpress;
                self.options.includePerfectScrollbar = self.options.includePerfectScrollbar || answers.includePerfectScrollbar;
                self.options.includeBuddySystem = self.options.includeBuddySystem || answers.includeBuddySystem;
                self.options.includeHoverIntent = self.options.includeHoverIntent || answers.includeHoverIntent;
                self.options.includeFonts = self.options.includeFonts || answers.includeFonts;

                self.composeWith('personal-angular', {
                    args: argsArray
                    , options: {
                        angularModuleName: self.options.angularModuleName
                        , includeBuddySystem: self.options.includeBuddySystem
                        , includeHoverIntent: self.options.includeHoverIntent
                    }
                });
                self.composeWith('personal-base', {
                    args: argsArray
                });
                self.composeWith('personal-express', {
                    args: argsArray
                });
                if (self.options.includeFonts) {
                    self.composeWith('personal-fonts', {
                        args: argsArray
                    });
                }

                self.composeWith('personal-javascript-libs', {
                    args: argsArray
                    , options: {
                        perfectScrollbar: self.options.includePerfectScrollbar
                        , buddySystem: self.options.includeBuddySystem
                        , hoverIntent: self.options.includeHoverIntent
                    }
                });

                self.composeWith('personal-pjson', {
                    args: argsArray
                    , options: {
                        includeAngular: !!self.options.angularModuleName
                    }
                });

                self.composeWith('personal-ptr', {
                    args: argsArray
                    , options: {
                        includeExpress: self.options.includeExpress
                        , angularModuleName: self.options.angularModuleName
                    }
                });

                self.composeWith('personal-scss', {
                    args: argsArray
                    , options: {
                        includePerfectScrollbar: self.options.includePerfectScrollbar
                        , includeFonts: self.options.includeFonts
                    }
                });

                done();
            });
    }
});
