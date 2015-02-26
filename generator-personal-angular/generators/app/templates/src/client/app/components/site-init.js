'use strict';

<% if (includeBuddySystem || includeHoverIntent) { %>
    // generated requires (from angular generator)
    <% if (includeBuddySystem) { %>
        var initBuddySystem = require('buddy-system'); <%
    } %>
    <% if (includeHoverIntent) { %>
        var initHoverIntent = require('hoverintent-jqplugin'); <%
    } %>
    // end of generated requires
    <%
} %>

function initSite($, $scope, log) { <% if (includeBuddySystem) { %>
        initBuddySystem($); <%
    } %>
    <% if (includeBuddySystem) { %>
        initHoverIntent($); <%
    } %>

    $scope.$on('$viewContentLoaded', function() {
        runPerViewLoad($, log);
    });
}

// This gets rid of all hover styles
function runPerViewLoad($, log) {
    log.debug('page/view loaded!');

    <% if (includeBuddySystem) { %>
        // budySystem is a plugin that removes possibility of single words at the end of a paragraph
        //  on the last line.
        var res = $('p').buddySystem(); <%
    } %>

    // disable :hover on touch devices
    // based on https://gist.github.com/4404503 
    // via https://twitter.com/javan/status/284873379062890496
    // + https://twitter.com/pennig/status/285790598642946048
    // re http://retrogamecrunch.com/tmp/hover
    if ('createTouch' in document) {
        try {
            var ignore = /:hover/;
            for (var i = 0; i < document.styleSheets.length; i++) {
                var sheet = document.styleSheets[i];
                for (var j = sheet.cssRules.length - 1; j >= 0; j--) {
                    var rule = sheet.cssRules[j];
                    if (rule.type === CSSRule.STYLE_RULE && ignore.test(rule.selectorText)) {
                        sheet.deleteRule(j);
                    }
                }
            }
        } catch (e) {}
    }
}

module.exports = initSite;
