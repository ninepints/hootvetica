/* AJAX client view code */

var ajaxClient = ajaxClient || {};
ajaxClient.view = {};


(function() {
    var modelAdapter;

    // User permissions
    var userIsAuthenticated;
    var userCanChangeLocation, userCanAddCategories,
        userCanChangeCategories, userCanDeleteCategories,
        userCanAddItems, userCanChangeItems, userCanChangeItemStatuses,
        userCanDeleteItems;

    // Existing page elements
    var body, contentDiv, statusbar, statusbarText, overlay;

    // URL for downloading UI elements
    var UIURL;

    // Downloaded elements
    var popup, popupTitle, deletionWarning, formInputs;
    var locationForm, locationOpen;
    var categoryForm, categoryName, categoryHeat, categoryParent;
    var itemForm, itemName, itemQty, itemQtyUl, itemStatus, itemParent;
    var confirmButton, cancelButton, buttonsEnabled;
    var popupStatusbar, popupStatusbarText;
    var locationTemplate, categoryTemplate, itemTemplate;


    function LocationMiniView(miniModelAdapter, attachCallback) {
        // Clone template markup
        this.container = locationTemplate.clone();
        this.childrenDiv = this.container.children('div.categories');
        this.nameText = this.container.children('h1');
        this.emptyText = this.childrenDiv.children('h3').hide();
        this.closedBox = this.container.children('div.info');

        // Customize "closed" banner
        if (userCanChangeLocation) {
            this.closedBox.children('p').text('No information is visible' +
                ' to the public. You can open this location using the' +
                ' controls above.');
            this.closedBox.children('h3').remove();
        }
        else if (userIsAuthenticated) {
            this.closedBox.children('p').text('No information is visible' +
                ' to the public.');
            this.closedBox.children('h3').remove();
        }
        else
            this.closedBox.children('p').remove();

        // Button setup
        this.toggleButton = this.container.find('a.toggle')
            .on('click', function(event) {
                miniModelAdapter.showToggleDialog();
                event.preventDefault();
            });
        this.addButton = this.container.find('a.add')
            .on('click', function(event) {
                miniModelAdapter.showAddChildDialog();
                event.preventDefault();
            });
        if (!userCanChangeLocation && !userCanAddCategories)
            this.toggleButton.parent().parent().remove();
        else {
            this.container.addClass('editable');
            if (!userCanChangeLocation)
                this.toggleButton.parent().remove();
            if (!userCanAddCategories)
                this.addButton.parent().remove();
        }

        // Attach self to DOM
        attachCallback(this.container);
    };

    LocationMiniView.prototype.update = function(name, open) {
        this.nameText.text(name);
        if (open)
            this.closedBox.addClass('hidden');
        else
            this.closedBox.removeClass('hidden');
        if (!open && !userIsAuthenticated)
            this.childrenDiv.addClass('hidden');
        else
            this.childrenDiv.removeClass('hidden');
        this.toggleButton.text(open ? 'Close Location' : 'Open Location');
    };

    LocationMiniView.prototype.childDependentUpdate = function() {
        if (this.childrenDiv.children().length === 1)
            this.emptyText.show();
        else
            this.emptyText.hide();
    };

    LocationMiniView.prototype.append = function(element) {
        this.childrenDiv.append(element);
    };

    LocationMiniView.prototype.remove = function() {
        this.container.remove();
    };


    function CategoryMiniView(miniModelAdapter, attachCallback) {
        // Clone template markup
        this.container = categoryTemplate.clone();
        this.childrenDiv = this.container.children('div.items');
        this.nameText = this.container.children('h2');
        this.statusText = this.container.children('h3');

        // Setup collapsing
        this.nameText.on('click', jQuery.proxy(function() {
            if (!this.container.hasClass('empty'))
                this.container.toggleClass('collapsed');
        }, this));

        // Setup buttons
        this.editButton = this.container.find('a.edit')
            .on('click', function(event) {
                miniModelAdapter.showEditDialog();
                event.preventDefault();
            });
        this.deleteButton = this.container.find('a.delete')
            .on('click', function(event) {
                miniModelAdapter.showDeleteDialog();
                event.preventDefault();
            });
        this.addButton = this.container.find('a.add')
            .on('click', function(event) {
                miniModelAdapter.showAddChildDialog();
                event.preventDefault();
            });
        if (!userCanChangeCategories && !userCanDeleteCategories &&
                !userCanAddItems)
            this.editButton.parent().parent().remove();
        else {
            this.container.addClass('editable');
            if (!userCanChangeCategories)
                this.editButton.parent().remove();
            if (!userCanDeleteCategories)
                this.deleteButton.parent().remove();
            if (!userCanAddItems)
                this.addButton.parent().remove();
        }

        // Attach self to DOM
        attachCallback(this.container);
    };

    CategoryMiniView.prototype.update = function(name, hot, suppressFlash) {
        this.nameText.text(name);
        if (!suppressFlash)
            this.flash();
    };

    CategoryMiniView.prototype.childDependentUpdate = function() {
        var children = this.childrenDiv.children();
        var soldOutChildren = children.filter('.out');
        this.container.removeClass('empty out');
        if (children.length === 0) {
            this.container.addClass('empty collapsed');
            this.statusText.text('No items');
        }
        else if (children.length === soldOutChildren.length) {
            this.container.addClass('out');
            this.statusText.text('Sold out')
        }
        else
            this.statusText.text('Available');
    };

    CategoryMiniView.prototype.flash = function() {
        this.container.addClass('highlight slow-trans');
        setTimeout(jQuery.proxy(function() {
            this.container.removeClass('highlight');
        }, this), 50);
        setTimeout(jQuery.proxy(function() {
            this.container.removeClass('slow-trans');
        }, this), 3050);
    };

    CategoryMiniView.prototype.append = function(element) {
        this.childrenDiv.append(element);
    };

    CategoryMiniView.prototype.remove = function() {
        this.container.remove();
    };


    function ItemMiniView(miniModelAdapter, attachCallback) {
        // Clone template markup
        this.container = itemTemplate.clone();
        this.nameText = this.container.children('h3');
        this.statusText = this.container.children('p');

        // Button setup
        this.availableButton = this.container.find('a.available')
            .on('click', function(event) {
                miniModelAdapter.showSetAvailableDialog();
                event.preventDefault();
            });
        this.unavailableButton = this.container.find('a.out')
            .on('click', function(event) {
                miniModelAdapter.showSetUnavailableDialog();
                event.preventDefault();
            });
        this.editButton = this.container.find('a.edit')
            .on('click', function(event) {
                miniModelAdapter.showEditDialog();
                event.preventDefault();
            });
        this.deleteButton = this.container.find('a.delete')
            .on('click', function(event) {
                miniModelAdapter.showDeleteDialog();
                event.preventDefault();
            });
        if (!userCanChangeItems && !userCanChangeItemStatuses &&
                !userCanDeleteItems)
            this.editButton.parent().parent().remove();
        else {
            this.container.addClass('editable');
            if (userCanChangeItems || !userCanChangeItemStatuses) {
                this.availableButton.parent().remove();
                this.unavailableButton.parent().remove();
            }
            if (!userCanChangeItems)
                this.editButton.parent().remove();
            if (!userCanDeleteItems)
                this.deleteButton.parent().remove();

            this.container.on('click', jQuery.proxy(function(event) {
                $('div.item.active').not(this.container)
                    .removeClass('active');
                this.container.addClass('active');
                event.stopPropagation();
            }, this));
            $('body').on('click', function() {
                $('div.item.active').removeClass('active');
            });
        }

        // Attach self to DOM
        attachCallback(this.container);
    };

    ItemMiniView.prototype.update = function(name, qty, status,
            suppressFlash) {
        this.nameText.text(name);
        this.container.removeClass('low out');
        if (status === 'AVA')
            this.statusText.text('Available');
        else if (status === 'LOW') {
            this.statusText.text('Running low');
            this.container.addClass('low');
        }
        else if (status === 'OUT') {
            this.statusText.text('Sold out');
            this.container.addClass('out');
        }
        else if (status === 'QTY')
            this.statusText.text(qty + ' left');
        if (!suppressFlash)
            this.flash();
    };

    ItemMiniView.prototype.flash = function() {
        this.container.addClass('highlight');
        setTimeout(jQuery.proxy(function() {
            this.container.removeClass('highlight');
        }, this), 50);
    };

    ItemMiniView.prototype.remove = function() {
        this.container.remove();
    };


    function qtyFieldVisCheck() {
        // Show quantity field iff status is set to quantity display
        if (itemStatus.val() !== 'QTY')
            itemQtyUl.hide();
        else
            itemQtyUl.show();
    };

    function setConfirmCallback(confirmCallback) {
        // Attach provided click handler to popup confirm button
        confirmButton.off('click').on('click', function(event) {
            if (buttonsEnabled) confirmCallback();
            event.preventDefault();
        });
    };

    function cancel() {
        // Hide popup and cancel active request
        ajaxClient.view.showPopup(false);
        modelAdapter.cancelRequest();
    };


    this.init = function(URL, authenticated, canChangeLocation,
            canAddCategories, canChangeCategories, canDeleteCategories,
            canAddItems, canChangeItems, canChangeItemStatuses,
            canDeleteItems, adapter) {
        UIURL = URL;
        userIsAuthenticated = authenticated;
        userCanChangeLocation = canChangeLocation;
        userCanAddCategories = canAddCategories;
        userCanChangeCategories = canChangeCategories;
        userCanDeleteCategories = canDeleteCategories;
        userCanAddItems = canAddItems;
        userCanChangeItems = canChangeItems;
        userCanChangeItemStatuses = canChangeItemStatuses;
        userCanDeleteItems = canDeleteItems;
        modelAdapter = adapter;
        body = $('body');
        contentDiv = $('div#container');
        statusbar = $('div#container > div.statusbar');
        statusbarText = statusbar.children('p');
        overlay = $('div#overlay');
    };

    this.start = function() {
        // Hide static content
        var staticUI = contentDiv.children('div.location').hide();
        this.showStatusbar(true);
        this.setStatusbar('busy', 'Loading UI...');

        // Load UI
        jQuery.ajax({
            url: UIURL,
            dataType: 'html',

            success: jQuery.proxy(function(data, textStatus, jqXHR) {
                staticUI.remove();

                // On success, process downloaded markup
                var parsedData = $(data);
                popup = parsedData.filter('div.popup').hide();
                overlay.on('click', function(event) {
                    cancel();
                    event.stopPropagation();
                });
                popup.on('click', function(event) {
                    event.stopPropagation();
                });
                popupTitle = popup.children('h2');
                deletionWarning = popup.children('p');
                formInputs = popup.find('input, select');

                locationForm = popup.children('#locationform');
                locationOpen = locationForm.children('input#open');
                categoryForm = popup.children('#categoryform');
                categoryName = categoryForm.find('input#cname');
                categoryHeat = categoryForm.find('input#heat');
                categoryParent = categoryForm.children('input#cparent');
                itemForm = popup.children('#itemform');
                itemName = itemForm.find('input#iname');
                itemQty = itemForm.find('input#quantity');
                itemQtyUl = itemQty.parent().parent();
                itemStatus = itemForm.find('select#status')
                    .on('change', qtyFieldVisCheck);
                itemParent = itemForm.children('input#iparent');

                popupStatusbar = popup.children('div.statusbar');
                popupStatusbarText = popupStatusbar.children('p');

                locationTemplate = parsedData.filter('div.location');
                categoryTemplate = parsedData.filter('div.category');
                itemTemplate = parsedData.filter('div.item');

                // Attach event handlers for buttons and enter/esc keypresses
                locationForm.add(categoryForm).add(itemForm)
                    .on('submit', false);
                confirmButton = popup.find('a.confirm')
                    .on('click', false);
                cancelButton = popup.find('a.cancel')
                    .on('click', function(event) {
                        cancel();
                        event.preventDefault();
                    });
                $(document).on('keydown', function(event) {
                    if (event.which === 13) {
                        confirmButton.trigger('click');
                    }
                    else if (event.which === 27) {
                        cancelButton.trigger('click');
                    }
                });
                buttonsEnabled = false;

                // Attach popup to DOM
                popup.appendTo(overlay);

                // Done starting view, start model
                this.showStatusbar(false);
                modelAdapter.start();
            }, this),

            error: jQuery.proxy(function(jqXHR, textStatus, errorThrown) {
                // Load failed, redisplay static content
                var msg = 'Failed to load UI';
                this.setStatusbar('error', errorThrown ? msg +
                    ' (' + errorThrown + ')' : msg);
                setTimeout(jQuery.proxy(function() {
                    this.showStatusbar(false);
                }, this), 10000);
                staticUI.show();
            }, this)
        });
    };

    this.append = function(element) { contentDiv.append(element) };

    this.showStatusbar = function(bool) {
        if (bool)
            statusbar.removeClass('hidden');
        else
            statusbar.addClass('hidden');
    };

    this.setStatusbar = function(sbclass, text) {
        var wasHidden = statusbar.hasClass('hidden');
        statusbar.removeClass().addClass('statusbar');
        if (wasHidden)
            statusbar.addClass('hidden');
        statusbarText.text(text);
        if (sbclass)
            statusbar.addClass(sbclass);
    };

    this.showPopupStatusbar = function(bool) {
        if (bool)
            popupStatusbar.removeClass('hidden');
        else
            popupStatusbar.addClass('hidden');
    };

    this.setPopupStatusbar = function(sbclass, text) {
        var wasHidden = popupStatusbar.hasClass('hidden');
        popupStatusbar.removeClass().addClass('statusbar');
        if (wasHidden)
            popupStatusbar.addClass('hidden');
        popupStatusbarText.text(text);
        if (sbclass)
            popupStatusbar.addClass(sbclass);
    };

    this.showPopup = function(bool, title) {
        if (bool) {
            popupTitle.text(title);
            this.enableButtons(true);
            this.setPopupConfirmText('Done');
            popup.find('li.error').remove();
            deletionWarning.add(categoryForm).add(itemForm).hide();

            body.addClass('noscroll');
            popup.show();
            overlay.removeClass('hidden');
        }
        else {
            this.enableButtons(false);
            this.showPopupStatusbar(false);

            overlay.addClass('hidden');
            popup.hide();
            body.removeClass('noscroll');
        }
    };

    this.showLocationForm = function(opening, confirmCallback) {
        this.showPopup(true, (opening ? 'Opening' : 'Closing')+' location');
        locationOpen.val(opening.toString());
        setConfirmCallback(function() {
            confirmCallback(locationForm.serialize());
        });

        // User can't edit form, so callback is invoked immediately
        confirmCallback(locationForm.serialize());
    };

    this.showCategoryForm = function(name, hot, parent, confirmCallback) {
        this.showPopup(true, 'Edit category');
        categoryForm.show();
        categoryName.val(name).focus().select();
        categoryHeat.prop('checked', hot);
        categoryParent.val(parent);
        setConfirmCallback(function() {
            confirmCallback(categoryForm.serialize());
        });
    };

    this.addCategoryErrors = function(fieldErrors, nonFieldErrors) {
        popup.find('li.error').remove();
        for (var i = 0; i < fieldErrors.length; i++) {
            var error = fieldErrors[i];
            var field = null;
            if (error.field === 'name') field = categoryName.parent();
            else if (error.field === 'contents_hot') field = categoryHeat.parent();
            if (field) {
                for (var j = 0; j < error.errors.length; j++) {
                    field.after('<li class="error">' +
                        error.errors[j] + '</li>');
                }
            }
        }
        var form = categoryForm.children('ul.form');
        for (var i = nonFieldErrors.length - 1; i >= 0; i--) {
            form.prepend('<li class="error">' + nonFieldErrors[i] + '</li>');
        }
    };

    this.showItemForm = function(name, qty, status,
                                 parent, confirmCallback) {
        this.showPopup(true, 'Edit item');
        itemForm.show();
        itemName.val(name).focus().select();
        itemQty.val(qty);
        itemStatus.val(status).change();
        itemParent.val(parent);
        setConfirmCallback(function() {
            confirmCallback(itemForm.serialize());
        });
    };

    this.addItemErrors = function(fieldErrors, nonFieldErrors) {
        popup.find('li.error').remove();
        for (var i = 0; i < fieldErrors.length; i++) {
            var error = fieldErrors[i];
            var field = null;
            if (error.field === 'name') field = itemName.parent();
            else if (error.field === 'quantity') field = itemQty.parent();
            else if (error.field === 'status') field = itemStatus.parent();
            if (field) {
                for (var j = 0; j < error.errors.length; j++) {
                    field.after('<li class="error">' +
                        error.errors[j] + '</li>');
                }
            }
        }
        var form = itemForm.children('ul.form');
        for (var i = nonFieldErrors.length - 1; i >= 0; i--) {
            form.prepend('<li class="error">' + nonFieldErrors[i] + '</li>');
        }
    };

    this.showItemStatusForm = function(status, confirmCallback) {
        this.showPopup(true, 'Updating item');
        itemStatus.val(status);
        setConfirmCallback(function() {
            confirmCallback(itemForm.serialize());
        });

        // User can't edit form, so callback is invoked immediately
        confirmCallback(itemForm.serialize());
    };

    this.showDeletionWarning = function(model, name,
                                        ominous, confirmCallback) {
        this.showPopup(true, 'Delete ' + model + ' "' + name + '"');
        deletionWarning.show();
        if (ominous)
            deletionWarning.text('Are you sure?' +
                ' Any children will be deleted as well.' +
                ' This action is permanent.');
        else
            deletionWarning.text('Are you sure?' +
                ' This action is permanent.');
        this.setPopupConfirmText('Delete');
        setConfirmCallback(confirmCallback);
    };

    this.enableButtons = function(bool) {
        if (bool) {
            confirmButton.removeClass('disabled');
            buttonsEnabled = true;
            formInputs.prop('disabled', false);
        }
        else {
            confirmButton.addClass('disabled');
            buttonsEnabled = false;
            formInputs.prop('disabled', true);
        }
    };

    this.setPopupConfirmText = function(text) {
        confirmButton.text(text);
    };

    // Accessors for mini-view constructors
    this.makeLocationMiniView = function(miniModelAdapter,
            attachCallback) {
        return new LocationMiniView(miniModelAdapter,
            attachCallback);
    };
    this.makeCategoryMiniView = function(miniModelAdapter, attachCallback) {
        return new CategoryMiniView(miniModelAdapter, attachCallback);
    };
    this.makeItemMiniView = function(miniModelAdapter, attachCallback) {
        return new ItemMiniView(miniModelAdapter, attachCallback);
    };
}).apply(ajaxClient.view);
