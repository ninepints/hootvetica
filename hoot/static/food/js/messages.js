// Adds close buttons to message banners

$(document).ready(function() {
    var messagelist = $('#messagelist')
    var messages = messagelist.children('li');
    var button = $('<a class="close noline">X</a>').on('click', function() {
        var parent = $(this).parent().addClass('hidden');
        setTimeout(function() {
            parent.remove();
            if (messagelist.children('li').length == 0)
                messagelist.remove();
        }, 1000);
    });
    messages.append(button);
});
