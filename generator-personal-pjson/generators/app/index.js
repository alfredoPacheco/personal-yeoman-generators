'use strict';


//---------//
// Imports //
//---------//

var generators = require('yeoman-generator')
    , bPromise = require('bluebird')
    , l = require('lambda-js')
    , path = require('path')
    , bNpm = require('./bluebird-npm')
    , bRimraf = bPromise.promisify(require('rimraf'))
    , bInquirer = require('bluebird-inquirer')
    , pgc = require('personal-generator-common')
    , toBool = require('boolean');


//------//
// Init //
//------//

// Making my own defaults since npm was poorly designed surrounding that portion of the code.  There is no standard set of defaults
//   and its own init program arbitrarily hardcodes its own defaults when prompting users.
var npmArbitraryDefaults = {
    version: '0.1.0',
    main: 'index.js',
    license: 'ISC'
};
var EOL = require('os').EOL;
var packageJson = {};

var pname;
var includeAngularOpt;

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

        this.option('includeAngular');
    },
    'initializing': function initializing() {
        packageJson.browser = {
            TweenLite: "./node_modules/gsap/src/uncompressed/TweenLite.js"
            , gsapCssPlugin: "./node_modules/gsap/src/uncompressed/plugins/CSSPlugin.js"
        };
    },
    'prompting': function prompting() {
        var self = this;
        var done = self.async();

        // needed to use project name in multiple generators. The below just initializes the project name by setting our destinationRoot to it
        //   plus runs it through a validator.
        pname = new pgc.ProjectNameState(self);

        return npmInitPrompt(self)
            .then(function() {
                done();
            });
    },
    'writing': function writing() {
        var self = this;

        if (self.options.includeAngular) {
            packageJson.browser.angular = "./node_modules/angular/angular.js";
            packageJson.browser["angular-route"] = "./node_modules/angular-route/angular-route.js";
            packageJson.browserify = {
                transform: 'browserify-shim'
            };
            packageJson["browserify-shim"] = {
                angular: {
                    depends: [
                        "jquery: jQuery"
                    ],
                    exports: "angular"
                },
                "angular-route": {
                    depends: [
                        "angular"
                    ],
                    exports: "angular.module('ngRoute').name"
                }
            };
            packageJson.environment = {
                env_var_name: packageJson.name.toUpperCase().replace(/-/g, '_') + "_NODE_ENV"
            };
        }

        self.fs.write(
            self.destinationPath('package.json')
            , JSON.stringify(packageJson, null, 4) + EOL
        );
    }
});

function npmInitPrompt(self) {
    return bNpm.loadAsync(null)
        .then(function() {
            return bInquirer.prompt([
                    pname.getPrompt() // only prompts if a project name wasn't passed in via arguments
                    , {
                        'name': 'npminit'
                        , 'message': 'Enter npm init info?  If not defaults will be used and you can change details later (y/n)'
                        , 'type': 'list'
                        , 'choices': ['y', 'n']
                        , 'default': 1
                    }, {
                        'name': 'npminit_ver'
                        , 'message': 'Version'
                        , 'type': 'input'
                        , 'default': bNpm.config.get("init.version") || npmArbitraryDefaults.version
                        , 'when': l('w', 'w.npminit === "y"')
                    }, {
                        'name': 'npminit_desc'
                        , 'message': 'Module description'
                        , 'type': 'input'
                        , 'when': l('w', 'w.npminit === "y"')
                    }, {
                        'name': 'npminit_main'
                        , 'message': 'Entry point'
                        , 'type': 'input'
                        , 'default': bNpm.config.get("main") || npmArbitraryDefaults.main
                        , 'when': l('w', 'w.npminit === "y"')
                    }, {
                        'name': 'npminit_author_name'
                        , 'message': 'Author name'
                        , 'type': 'input'
                        , 'default': bNpm.config.get("init.author.name") || ''
                        , 'when': l('w', 'w.npminit === "y"')
                    }, {
                        'name': 'npminit_author_email'
                        , 'message': 'Author email'
                        , 'type': 'input'
                        , 'default': bNpm.config.get("init.author.email") || ''
                        , 'when': l('w', 'w.npminit === "y"')
                    }, {
                        'name': 'npminit_author_url'
                        , 'message': 'Author home page (url)'
                        , 'type': 'input'
                        , 'default': bNpm.config.get("init.author.url") || ''
                        , 'when': l('w', 'w.npminit === "y"')
                    }, {
                        'name': 'npminit_license'
                        , 'message': 'Module license'
                        , 'type': 'input'
                        , 'default': bNpm.config.get("init.license") || npmArbitraryDefaults.license
                        , 'when': l('w', 'w.npminit === "y"')
                    }, {
                        'name': 'includeAngular'
                        , 'message': 'Include angular? (y/n)'
                        , 'type': 'list'
                        , 'choices': ['y', 'n']
                        , 'default': 1
                        , 'when': function() {
                            return self.options.includeAngular === 'undefined';
                        }
                    },
                ])
                .then(function(answers) {
                    if (answers.npminit === 'y') {
                        packageJson.version = answers.npminit_ver;
                        packageJson.description = answers.npminit_desc;
                        packageJson.main = answers.npminit_main;
                        packageJson.author = answers.npminit_author_name + " <" + answers.npminit_author_email + ">" + " (" + answers.npminit_author_url + ")";
                        packageJson.license = answers.npminit_licens;
                    } else {
                        packageJson.version = npmArbitraryDefaults.version;
                        packageJson.main = npmArbitraryDefaults.main;
                        packageJson.license = npmArbitraryDefaults.license;
                    }

                    if (answers.projectName) {
                        self.destinationRoot(path.join(self.destinationRoot(), answers.projectName));
                    }

                    includeAngularOpt = toBool(self.options.includeAngular) || (answers.includeAngular === 'y');
                    packageJson.name = self.projectNameArg || answers.projectName || path.basename(self.destinationRoot());
                });
        });
}
