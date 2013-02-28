// Attaches dropdown menu click handlers on load

$(document).ready(function() {
    var dropdown = $("#userdropdown");
    $('#userdropdownlink').on('click', function(event) {
        dropdown.toggle();
        return false;
    }).parent().show();
    $("body").on('click', function(event){
        dropdown.hide();
    });
});
