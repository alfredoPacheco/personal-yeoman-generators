'use strict';

module.exports = function(app, log) {
    app.directive('error404', function($location) {
        return {
            restrict: 'A'
            , template: "The page '" + $location.path() + "' was not found."
        };
    });
};
