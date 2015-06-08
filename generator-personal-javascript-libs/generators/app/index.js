'use strict';


//---------//
// Imports //
//---------//

var generators = require('yeoman-generator')
    , pgc = require('personal-generator-common')
    , path = require('path')
    , bPromise = require('bluebird')
    , bInquirer = require('bluebird-inquirer')
    , nh = require('node-helpers')
    , l = require('lambda-js')
    , toBool = require('boolean');


//------//
// Init //
//------//

var TASKS_DIR_DEFAULT = 'tasks';
var lazy = nh.lazyExtensions;

var jsLibs = {
    fancybox: 'fancybox'
    , buddySystem: 'buddy-system'
    , hoverIntent: 'hoverintent-jqplugin'
    , perfectScrollbar: 'perfect-scrollbar'
};

var jsLibsInstall = {
    fancybox: 'fancybox'
    , buddySystem: 'buddy-system'
    , hoverIntent: 'hoverintent-jqplugin'
    , perfectScrollbar: 'git://github.com/noraesae/perfect-scrollbar.git'
};

var includeAllOpt;


//------//
// Main //
//------//

module.exports = generators.Base.extend({
    'constructor': function constructor() {
        var self = this;

        generators.Base.apply(this, arguments);
        var numParams = (2 + Object.keys(jsLibs).length);
        if (arguments[0].length > numParams) {
            throw new Error("generator-personal-pjson only expects up to " + numParams + " arguments.  The following were given: " + arguments[0]);
        }
        self.argument('projectName', {
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

        self.option('includeAll');
        Object.keys(jsLibs).forEach(function(k) {
            self.option(k);
        });

        includeAllOpt = toBool(self.options.includeAll);
    },
    'prompting': function prompting() {
        var self = this;
        var done = self.async();

        // needed to use project name in multiple generators. The below just initializes the project name, if passed,
        //   by setting our destinationRoot to it plus runs it through a validator.
        var pname = new pgc.ProjectNameState(self);

        bInquirer.prompt(getPrompts([pname.getPrompt()], self))
            .then(function(answers) {
                if (answers.projectName) {
                    self.destinationRoot(path.join(self.destinationRoot(), answers.projectName));
                }
                if (!includeAllOpt) {
                    var installList = lazy(jsLibs)
                        .keys()
                        .filter(function(k) {
                            return toBool(self.options[k])
                                || (answers[k] === 'y');
                        })
                        .map(function(k) {
                            return jsLibsInstall[k];
                        })
                        .toArray();

                    self.npmInstall(installList, {
                        'save': true
                    });
                }
                done();
            });
    }
});


//---------//
// Helpers //
//---------//

function getPrompts(existing, ctx) {
    var res = existing;
    Object.keys(jsLibs).forEach(function(k) {
        existing.push({
            'name': k
            , 'message': 'Include ' + jsLibs[k] + '?'
            , 'type': 'list'
            , 'choices': ['y', 'n']
            , 'default': 1
            , 'when': function() {
                return !ctx.options.includeAll && typeof ctx.options[k] === 'undefined';
            }
        });
    });
    return res;
}

function getInstallList(existing) {
    var res = existing || [];

    Object.keys(jsLibs).forEach(function(k) {
        res.push(jsLibs[k]);
    });

    return res;
}
