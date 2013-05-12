// Gives the first empty text/password field focus on load

$(document).ready(function() {
    var fields = $('input[type="text"], input[type="password"]');
    for (var i = 0; i < fields.length; i++) {
        var field = fields.eq(i);
        if (!field.val()) {
            field.focus();
            return;
        }
    }
    if (fields.length >= 1)
        fields.eq(0).focus();
});
