// Displays an introduction popup on the location detail page

$(document).ready(function() {
    if (deferIntro || ajaxClient.utils.getCookie('completedIntro') === 'true')
        return;
    document.cookie = 'completedIntro=true;path=/';
    if (skipIntro)
        return;

    var body = $('body'), overlay = $('#overlay'), popup,
        category, item, itemText;
    var stage = 0, stageTexts;

    function advance() {
        if (stage < 2) {
            stageTexts.eq(stage).addClass('fade');
            stage++;
            stageTexts.eq(stage).removeClass('hidden');
        }
    };

    function flash() {
        item.addClass('highlight');
        setTimeout(function() {
            item.removeClass('highlight');
        }, 50);
    };

    jQuery.ajax({
        url: introContentURL,
        dataType: 'html',
        success: function(data, textStatus, jqXHR) {
            popup = $(data).filter('div.popup');
            stageTexts = popup.children('p');
            category = popup.children('div.category');
            item = category.find('div.item.editable');
            itemText = item.children('p');
            overlay.on('click', function() {
                popup.remove();
            });
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
            item.on('click', function() {
                if (!item.hasClass('active'))
                    item.addClass('active');
            });
            item.find('a.available').on('click', function(event) {
                advance();
                flash();
                item.removeClass('out');
                itemText.text('Available');
                event.preventDefault();
            });
            item.find('a.out').on('click', function(event) {
                advance();
                flash();
                item.addClass('out');
                itemText.text('Sold out');
                event.preventDefault();
            });
            popup.find('a.confirm').on('click', function(event) {
                overlay.addClass('hidden');
                popup.remove();
                body.removeClass('noscroll');
                event.preventDefault();
            });

            // Show the popup
            body.addClass('noscroll');
            popup.show();
            overlay.removeClass('hidden');
        }
    });
});
