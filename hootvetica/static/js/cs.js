$(document).ready(function() {
    var keys = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65], i = 0;
    var prop = String.fromCharCode(102, 111, 110, 116, 45, 102, 97, 109, 105, 108, 121);
    var suffix = String.fromCharCode(105, 99, 32, 83, 97, 110, 115, 32, 77, 83);
    $(document).on('keydown.cs', function(event) {
        if (event.which === keys[i]) {
            if (++i === keys.length) {
                $(document).off('keydown.cs');
                $('head').append($('<style>body,blockquote::before,' +
                    'blockquote::after{' + prop + ':"Com' + suffix +
                    '"}</style>'));
                $('title, #homelink').text('Hoot' + suffix);
            }
        }
        else i = 0;
    });
});
