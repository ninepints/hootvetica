/* AJAX client utilities */

var ajaxClient = ajaxClient || {};
ajaxClient.utils = {};


(function() {
    // Gets the value of the specified cookie
    this.getCookie = function(name) {
        var cookieValue = null;
        if (document.cookie && document.cookie != '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = jQuery.trim(cookies[i]);
                if (cookie.substring(0, name.length + 1) == (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    };

    // Checks whether the given URL is same-origin
    // relative to the current location
    this.sameOrigin = function(url) {
        var host = document.location.host; // host + port
        var protocol = document.location.protocol;
        var sr_origin = '//' + host;
        var origin = protocol + sr_origin;
        // Allow absolute or scheme relative URLs to same origin
        return url === origin ||
            url.slice(0, origin.length + 1) === (origin + '/') ||
            url === sr_origin ||
            url.slice(0, sr_origin.length + 1) === (sr_origin + '/') ||
            // or any other URL that isn't scheme relative or absolute
            // i.e relative.
            !(/^(\/\/|http:|https:).*/.test(url));
    };

    // Checks whether the given method is non-destructive
    this.safeMethod = function(method) {
        return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
    };

    this.getEpochTime = function() {
        return Math.round(Date.now() / 1000);
    };
}).apply(ajaxClient.utils);
