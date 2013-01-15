// Adds close buttons to message banners

$(document).ready(function() {
    var messages = $('#messagelist > li');
    var button = $('<a class="close">X</a>').on('click', function() {
        $(this).parent().remove();
    });
    messages.append(button);
});
