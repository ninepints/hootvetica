// Displays an introduction popup on the location detail page

$(document).ready(function() {
    if (deferIntro || ajaxClient.utils.getCookie('completedIntro') === 'true')
        return;

    var expires = new Date()
    expires.setUTCFullYear(expires.getUTCFullYear() + 10)
    document.cookie = 'completedIntro=true;path=/;max-age=315360000;expires=' +
        expires.toUTCString();

    if (skipIntro)
        return;

    var body = $('body'), overlay = $('#overlay'), popup,
        category, item, itemText;
    var stage = 0, stageTexts;

    function advance() {
        if (stage < stageTexts.length - 1) {
            stageTexts.eq(stage).addClass('fade');
            stage++;
            stageTexts.eq(stage).removeClass('hidden');
        }
    };

    function flash(item) {
        item.addClass('highlight');
        setTimeout(function() {
            item.removeClass('highlight');
        }, 50);
    };

    function exit() {
        overlay.addClass('hidden');
        popup.remove();
        body.removeClass('noscroll');
    };

    jQuery.ajax({
        url: introContentURL,
        dataType: 'xml',
        success: function(data, textStatus, jqXHR) {
            popup = $(data).find('div.popup');
            stageTexts = popup.children('p');
            category = popup.children('div.category');
            selects = category.find('select');
            popup.on('click', function(event) {
                event.stopPropagation();
            });
            popup.appendTo(overlay);

            // Attach walkthrough event handlers
            category.children('h2').on('click', function() {
                if (category.hasClass('collapsed')) {
                    advance();
                    category.removeClass('collapsed');
                }
            });
            selects.on('change', function() {
                var self = $(this);
                var item = self.parent();
                if (self.val() === 'AVA')
                    item.removeClass('out');
                else if (self.val() === 'OUT')
                    item.addClass('out');
                flash(item);
                advance();
            });
            popup.find('a.confirm').on('click', function(event) {
                exit();
                event.preventDefault();
            });

            // Show the popup
            body.addClass('noscroll');
            popup.show();
            overlay.removeClass('hidden');
        }
    });
});
