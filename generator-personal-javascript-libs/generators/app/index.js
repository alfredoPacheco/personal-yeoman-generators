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
    , l = require('lambda-js');


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
            type: String, required: false
        });
        self.option('includeAll', {
            type: Boolean
        });
        Object.keys(jsLibs).forEach(function(k) {
            self.option(k, {
                type: Boolean
            });
        });

        self.options.includeAll =
            (typeof self.options.includeAll !== 'undefined' && self.options.includeAll)
            || false;
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
                if (!self.options.includeAll) {
                    var installList = lazy(jsLibs)
                        .keys()
                        .filter(function(k) {
                            return self.options[k]
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
