/* Client-side javascript for the location detail page - enables AJAX form
 * submission and update polling. */

// Namespacing
var hoot = hoot || {};
hoot.food = {};

(function() {
    var started = false;



    // View
    var view = {};
    (function() {
        var modelAdapter;

        // User permissions
        var userIsAuthenticated;
        var userCanChangeLocation, userCanAddCategories,
            userCanChangeCategories, userCanDeleteCategories,
            userCanAddItems, userCanChangeItems, userCanChangeItemStatuses,
            userCanDeleteItems;

        // Existing page elements
        var body, contentDiv, statusbar, statusbarText;

        // URL for downloading UI elements
        var UIURL;

        // Downloaded elements
        var overlay, popupTitle, deletionWarning, formInputs;
        var locationForm, locationOpen;
        var categoryForm, categoryName, categoryHeat, categoryParent;
        var itemForm, itemName, itemQty, itemQtyUl, itemStatus, itemParent;
        var confirmButton, cancelButton, buttonsEnabled;
        var popupStatusbar, popupStatusbarText;
        var locationTemplate, categoryTemplate, itemTemplate;

        // Local functions
        var qtyFieldVisCheck, setConfirmCallback, cancel;


        function LocationMiniView(miniModelAdapter, attachCallback) {
            // Clone/customize template markup and attach event handlers
            this.container = locationTemplate.clone();
            this.childrenDiv = this.container.children('div.categories');
            this.nameText = this.container.find('h1');
            this.closedBox = this.container.children('div.info');
            if (userCanChangeLocation)
            {
                this.closedBox.children('p').text('No information is visible' +
                    ' to the public. You can open this location using the' +
                    ' controls above.');
                this.closedBox.children('h3').remove();
            }
            else if (userIsAuthenticated)
            {
                this.closedBox.children('p').text('No information is visible' +
                    ' to the public.');
                this.closedBox.children('h3').remove();
            }
            else
            {
                this.closedBox.children('p').remove();
            }

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
            else
            {
                this.container.addClass('editable');
                if (!userCanChangeLocation)
                    this.toggleButton.parent().remove();
                if (!userCanAddCategories)
                    this.addButton.parent().remove();
            }

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

        LocationMiniView.prototype.append = function(element) {
            this.childrenDiv.append(element);
        };

        LocationMiniView.prototype.remove = function() {
            this.container.remove();
        };


        function CategoryMiniView(miniModelAdapter, attachCallback) {
            // Clone/customize template markup and attach event handlers
            this.container = categoryTemplate.clone();
            this.childrenDiv = this.container.children('div.items');
            this.nameText = this.container.children('h2');
            this.statusText = this.container.children('h3');

            this.nameText.on('click', jQuery.proxy(function() {
                if (!this.container.hasClass('empty'))
                    this.container.toggleClass('collapsed');
            }, this));

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
            else
            {
                this.container.addClass('editable');
                if (!userCanChangeCategories)
                    this.editButton.parent().remove();
                if (!userCanDeleteCategories)
                    this.deleteButton.parent().remove();
                if (!userCanAddItems)
                    this.addButton.parent().remove();
            }

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
            else {
                this.statusText.text('Available');
            }
        };

        // Applies a highlight class for 50ms, which should fade slowly using
        // a CSS transition
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
            // Clone/customize template markup and attach event handlers
            this.container = itemTemplate.clone();
            this.nameText = this.container.find('h3');
            this.statusText = this.container.find('p');

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
            else
            {
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

            attachCallback(this.container);
        };

        ItemMiniView.prototype.update = function(name, qty, status,
                suppressFlash) {
            this.nameText.text(name);
            this.container.removeClass('low out');

            if (status === 'AVA')
            {
                this.statusText.text('Available');
            }
            else if (status === 'LOW')
            {
                this.statusText.text('Running low');
                this.container.addClass('low');
            }
            else if (status === 'OUT')
            {
                this.statusText.text('Sold out');
                this.container.addClass('out');
            }
            else if (status === 'QTY')
            {
                this.statusText.text(qty + ' left');
            }

            if (!suppressFlash)
                this.flash();
        };

        // Applies a highlight class for 50ms, which should fade slowly using
        // a CSS transition
        ItemMiniView.prototype.flash = function() {
            this.container.addClass('highlight slow-trans');
            setTimeout(jQuery.proxy(function() {
                this.container.removeClass('highlight');
            }, this), 50);
            setTimeout(jQuery.proxy(function() {
                this.container.removeClass('slow-trans');
            }, this), 3050);
        };

        ItemMiniView.prototype.remove = function() {
            this.container.remove();
        };


        // Shows quantity field when status is set to quantity display
        function qtyFieldVisCheck() {
            if (itemStatus.val() !== 'QTY') itemQtyUl.hide();
            else itemQtyUl.show();
        };

        // Attaches provided click handler to popup confirm button
        function setConfirmCallback(confirmCallback) {
            confirmButton.off('click').on('click', function(event) {
                if (buttonsEnabled) confirmCallback();
                event.preventDefault();
            });
        };

        // Hides popup and cancels active request
        function cancel() {
            view.showPopup(false);
            modelAdapter.cancelRequest();
        };


        // Main view initialization
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
        };

        // Main view start
        // Downloads UI elements then starts model
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

                    // On success, process new DOM tree
                    var parsedData = $(data);
                    overlay = parsedData.filter('#overlay')
                        .on('click', function(event) {
                            cancel();
                            event.stopPropagation();
                        });
                    overlay.children('.popup').on('click', function(event) {
                        event.stopPropagation();
                    });
                    popupTitle = overlay.find('div.popup > h2');
                    deletionWarning = overlay.find('div.popup > p');
                    formInputs = overlay.find('input, select');

                    locationForm = overlay.find('#locationform');
                    locationOpen = locationForm.children('input#open');
                    categoryForm = overlay.find('#categoryform');
                    categoryName = categoryForm.find('input#cname');
                    categoryHeat = categoryForm.find('input#heat');
                    categoryParent = categoryForm.children('input#cparent');
                    itemForm = overlay.find('#itemform');
                    itemName = itemForm.find('input#iname');
                    itemQty = itemForm.find('input#quantity');
                    itemQtyUl = itemQty.parent().parent();
                    itemStatus = itemForm.find('select#status')
                        .on('change', qtyFieldVisCheck);
                    itemParent = itemForm.children('input#iparent');
                    locationForm.add(categoryForm).add(itemForm)
                        .on('submit', false);

                    // Default event handlers for click, certain keypresses
                    confirmButton = overlay.find('a.confirm')
                        .on('click', false);
                    cancelButton = overlay.find('a.cancel')
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

                    buttonsEnabled = true;
                    popupStatusbar = overlay.find('div.statusbar');
                    popupStatusbarText = popupStatusbar.children('p');
                    locationTemplate = parsedData.filter('div.location');
                    categoryTemplate = parsedData.filter('div.category');
                    itemTemplate = parsedData.filter('div.item');

                    overlay.appendTo(body);

                    // Done starting view, start model
                    this.showStatusbar(false);
                    modelAdapter.start();
                }, this),

                error: jQuery.proxy(function(jqXHR, textStatus, errorThrown) {
                    // Redisplay static content if UI load fails
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

        // Shows/hides the main statusbar
        this.showStatusbar = function(bool) {
            if (bool)
                statusbar.removeClass('hidden');
            else
                statusbar.addClass('hidden');
        };

        // Gives the main statusbar the specified style and message
        this.setStatusbar = function(sbclass, text) {
            var wasHidden = statusbar.hasClass('hidden');
            statusbar.removeClass().addClass('statusbar');
            if (wasHidden)
                statusbar.addClass('hidden');
            statusbarText.text(text);
            if (sbclass)
                statusbar.addClass(sbclass);
        };

        // Hides or resets and displays the editing popup
        this.showPopup = function(bool, title) {
            if (bool) {
                popupTitle.text(title);
                this.enableButtons(true);
                this.setPopupConfirmText('Done');
                overlay.find('li.error').remove();
                deletionWarning.add(categoryForm).add(itemForm).hide();
                body.addClass('noscroll');
                overlay.removeClass('hidden');
            } else {
                this.enableButtons(false);
                this.showPopupStatusbar(false);
                overlay.addClass('hidden');
                body.removeClass('noscroll');
            }
        };

        // Displays editing popup with given location status
        // and confirmation callback function, automatically invoking callback
        this.showLocationToggle = function(opening, confirmCallback) {
            this.showPopup(true, (opening ? 'Opening' : 'Closing')+' Location');
            locationOpen.val(opening.toString());
            setConfirmCallback(function() {
                confirmCallback(locationForm.serialize());
            });
            confirmCallback(locationForm.serialize());
        };

        // Displays editing popup with given category information
        // and confirmation callback function
        this.showCategoryForm = function(name, hot, parent, confirmCallback) {
            this.showPopup(true, 'Edit Category');
            categoryForm.show();
            categoryName.val(name).focus().select();
            categoryHeat.prop('checked', hot);
            categoryParent.val(parent);
            setConfirmCallback(function() {
                confirmCallback(categoryForm.serialize());
            });
        };

        // Adds errors to category form, clearing existing errors
        this.addCategoryErrors = function(fieldErrors, nonFieldErrors) {
            overlay.find('li.error').remove();
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
            };
        };

        // Displays editing popup with given item information
        // and confirmation callback function
        this.showItemForm = function(name, qty, status,
                                     parent, confirmCallback) {
            this.showPopup(true, 'Edit Item');
            itemForm.show();
            itemName.val(name).focus().select();
            itemQty.val(qty);
            itemStatus.val(status).change();
            itemParent.val(parent);
            setConfirmCallback(function() {
                confirmCallback(itemForm.serialize());
            });
        };

        // Adds errors to item form, clearing existing errors
        this.addItemErrors = function(fieldErrors, nonFieldErrors) {
            overlay.find('li.error').remove();
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
            };
        };

        // Displays editing popup with given item status
        // and confirmation callback function, automatically invoking callback
        this.showItemStatusForm = function(status, confirmCallback) {
            this.showPopup(true, 'Updating Item');
            itemStatus.val(status);
            setConfirmCallback(function() {
                confirmCallback(itemForm.serialize());
            });
            confirmCallback(itemForm.serialize());
        };

        // Displays delete confirmation dialog with given callback function
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

        // Enables or disables editing popup controls
        this.enableButtons = function(bool) {
            if (bool) {
                confirmButton.removeClass('disabled');
                buttonsEnabled = true;
                formInputs.prop('disabled', false);
            } else {
                confirmButton.addClass('disabled');
                buttonsEnabled = false;
                formInputs.prop('disabled', true);
            }
        };

        // Sets the text on the editing popup confirm button
        this.setPopupConfirmText = function(text) {
            confirmButton.text(text);
        };

        // Shows/hides the editing popup statusbar
        this.showPopupStatusbar = function(bool) {
            if (bool)
                popupStatusbar.removeClass('hidden');
            else
                popupStatusbar.addClass('hidden');
        };

        // Gives the editing popup statusbar the specified style and message
        this.setPopupStatusbar = function(sbclass, text) {
            var wasHidden = popupStatusbar.hasClass('hidden');
            popupStatusbar.removeClass().addClass('statusbar');
            if (wasHidden)
                popupStatusbar.addClass('hidden');
            popupStatusbarText.text(text);
            if (sbclass)
                popupStatusbar.addClass(sbclass);
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
    }).apply(view);



    // Model
    var model = {};
    (function() {
        var viewAdapter;

        // Location data refresh intervals following successful/failed refresh
        var refreshInterval, refreshIntervalErr;

        var csrftoken;

        // Location data parsed from script tag
        var initLocationData;

        // Dictionary of mini-models (uses UUIDs for keys)
        var minimodels = {};

        // Timer for data refresh and refresh request object
        var refreshTimer, refreshRequest;

        // Last model update request object
        var postRequest;

        // Local functions
        var processUpdates, runRetryCountdown, refreshData, postData,
            getCookie, sameOrigin, safeMethod;


        /* Note that for minimodels, this.viewAdapter is the minimodel to
         * miniview adapter, while viewAdapter is the main view adapter which
         * I'm going to go ahead and use since it's in scope */

        function LocationMiniModel(json) {
            this.updateURL = json.updateURL;
            this.editURL = json.editURL;
            this.addChildURL = json.addChildURL;
            this.uid = json.uid;
            this.modified = 0;
            this.update(json);
        };

        LocationMiniModel.prototype.setViewAdapter = function(viewAdapter) {
            this.viewAdapter = viewAdapter;
            this.viewAdapter.update(this.name, this.open);
        };

        // Appends an element to the model's view's children div
        LocationMiniModel.prototype.append = function(element) {
            this.viewAdapter.append(element);
        };

        // Shows a toggle dialog (and automatically sends toggle request)
        LocationMiniModel.prototype.showToggleDialog = function() {
            viewAdapter.showLocationToggle(!this.open,
                jQuery.proxy(this.confirmToggle, this));
        };

        // Sends a toggle request to the server
        LocationMiniModel.prototype.confirmToggle = function(data) {
            postData(data, this.editURL, function() {
                // This only gets invoked if the server rejects the update
                // request (so hopefully never)
                viewAdapter.showPopupStatusbar(true);
                viewAdapter.setPopupStatusbar('error',
                            'Server rejected update');
            });
        };

        // Displays category add dialog
        LocationMiniModel.prototype.showAddChildDialog = function() {
            viewAdapter.showCategoryForm('New Category', false, this.uid,
                jQuery.proxy(this.confirmAddChild, this));
        };

        // Sends category add request to the server
        LocationMiniModel.prototype.confirmAddChild = function(data) {
            postData(data, this.addChildURL, viewAdapter.addCategoryErrors);
        };

        LocationMiniModel.prototype.update = function(json) {
            if (json.modified > this.modified) {
                this.name = json.name;
                this.open = json.open;
                this.modified = json.modified;
                if (this.viewAdapter)
                    this.viewAdapter.update(this.name, this.open);
            }
        };

        LocationMiniModel.prototype.remove = function() {
            this.viewAdapter.remove();
        };


        function CategoryMiniModel(json, parent) {
            this.editURL = json.editURL;
            this.deleteURL = json.deleteURL;
            this.addChildURL = json.addChildURL;
            this.parent = parent;
            this.uid = json.uid;
            this.modified = 0;
            this.update(json);
        };

        CategoryMiniModel.prototype.setViewAdapter = function(viewAdapter) {
            this.viewAdapter = viewAdapter;
            this.viewAdapter.update(this.name, this.heat, true);
        };

        // Appends an element to the model's view
        CategoryMiniModel.prototype.append = function(element) {
            this.viewAdapter.append(element);
        };

        // Displays item add dialog
        CategoryMiniModel.prototype.showAddChildDialog = function() {
            viewAdapter.showItemForm('New Item', '', 'AVA', this.uid,
                jQuery.proxy(this.confirmAddChild, this));
        };

        // Sends item add request to server
        CategoryMiniModel.prototype.confirmAddChild = function(data) {
            postData(data, this.addChildURL, viewAdapter.addItemErrors);
        };

        // Shows category edit dialog
        CategoryMiniModel.prototype.showEditDialog = function() {
            viewAdapter.showCategoryForm(this.name, this.heat, this.parent,
                jQuery.proxy(this.confirmEdit, this));
        };

        // Sends category edit request to server
        CategoryMiniModel.prototype.confirmEdit = function(data) {
            postData(data, this.editURL, viewAdapter.addCategoryErrors);
        };

        // Shows category delete dialog
        CategoryMiniModel.prototype.showDeleteDialog = function() {
            viewAdapter.showDeletionWarning('Category', this.name, true,
                jQuery.proxy(this.confirmDelete, this));
        };

        // Sends category delete request to server
        CategoryMiniModel.prototype.confirmDelete = function() {
            postData(null, this.deleteURL);
        };

        CategoryMiniModel.prototype.update = function(json) {
            if (json.modified > this.modified) {
                this.name = json.name;
                this.heat = json.contents_hot;
                this.modified = json.modified;
                if (this.viewAdapter) this.viewAdapter.update(this.name, this.heat);
            }
        };

        CategoryMiniModel.prototype.childDependentUpdate = function() {
            this.viewAdapter.childDependentUpdate();
        }

        CategoryMiniModel.prototype.flash = function() {
            this.viewAdapter.flash();
        };

        CategoryMiniModel.prototype.remove = function() {
            this.viewAdapter.remove();
        };


        function ItemMiniModel(json, parent) {
            this.editURL = json.editURL;
            this.editStatusURL = json.editStatusURL;
            this.deleteURL = json.deleteURL;
            this.parent = parent;
            this.uid = json.uid;
            this.modified = 0;
            this.update(json);
        };

        ItemMiniModel.prototype.setViewAdapter = function(viewAdapter) {
            this.viewAdapter = viewAdapter;
            this.viewAdapter.update(this.name, this.qty, this.status, true);
        };

        // Displays item edit dialog
        ItemMiniModel.prototype.showEditDialog = function() {
            viewAdapter.showItemForm(this.name, this.qty, this.status,
                this.parent, jQuery.proxy(this.confirmEdit, this));
        };

        // Sends item edit request to server
        ItemMiniModel.prototype.confirmEdit = function(data) {
            postData(data, this.editURL, viewAdapter.addItemErrors);
        };

        ItemMiniModel.prototype.showSetAvailableDialog = function() {
            viewAdapter.showItemStatusForm('AVA',
                jQuery.proxy(this.confirmEditStatus, this));
        };

        ItemMiniModel.prototype.showSetUnavailableDialog = function() {
            viewAdapter.showItemStatusForm('OUT',
                jQuery.proxy(this.confirmEditStatus, this));
        };

        ItemMiniModel.prototype.confirmEditStatus = function(data) {
            postData(data, this.editStatusURL, function() {
                // Again, only gets invoked if the server rejects the update
                // request (so hopefully never)
                viewAdapter.showPopupStatusbar(true);
                viewAdapter.setPopupStatusbar('error',
                            'Server rejected update');
            });
        };

        // Displays item delete dialog
        ItemMiniModel.prototype.showDeleteDialog = function() {
            viewAdapter.showDeletionWarning('Item', this.name, false,
                jQuery.proxy(this.confirmDelete, this));
        };

        // Sends item delete request to server
        ItemMiniModel.prototype.confirmDelete = function() {
            postData(null, this.deleteURL);
        };

        ItemMiniModel.prototype.update = function(json) {
            if (json.modified > this.modified) {
                this.name = json.name;
                this.qty = json.quantity;
                this.status = json.status;
                this.modified = json.modified;
                if (this.viewAdapter)
                    this.viewAdapter.update(this.name, this.qty, this.status);
            }
        };

        ItemMiniModel.prototype.flash = function() {
            this.viewAdapter.flash();
        };

        ItemMiniModel.prototype.remove = function() {
            this.viewAdapter.remove();
        };


        // Updates existing model hierarchy with new location data
        function processUpdates(locationData) {
            var newMinimodels = {};

            // Update location model and move to "new" dictionary
            var location = minimodels[locationData.uid];
            delete minimodels[locationData.uid];
            newMinimodels[locationData.uid] = location;
            location.update(locationData);

            // For each category in new location data:
            for (var i = 0; i < locationData.categories.length; i++) {
                var categoryData = locationData.categories[i];
                var category;

                if (minimodels[categoryData.uid]) {
                    // Update existing model and move to "new" dictionary
                    category = minimodels[categoryData.uid];
                    delete minimodels[categoryData.uid];
                    newMinimodels[categoryData.uid] = category;
                    category.update(categoryData);
                } else {
                    // Make a new model
                    category = new CategoryMiniModel(categoryData,
                                                     locationData.uid);
                    category.setViewAdapter(
                        viewAdapter.makeCategoryMiniViewAdapter(category,
                            jQuery.proxy(location.append, location)));
                    newMinimodels[categoryData.uid] = category;
                    category.flash();
                }

                // For each item in new category data:
                for (var j = 0; j < categoryData.items.length; j++) {
                    var itemData = categoryData.items[j];
                    var item;

                    if (minimodels[itemData.uid]) {
                        // Update existing model and move to "new" dictionary
                        item = minimodels[itemData.uid];
                        delete minimodels[itemData.uid];
                        newMinimodels[itemData.uid] = item;
                        item.update(itemData);
                    } else {
                        // Make a new model
                        var item = new ItemMiniModel(itemData,
                                                     categoryData.uid);
                        item.setViewAdapter(viewAdapter.makeItemMiniViewAdapter(
                            item, jQuery.proxy(category.append, category)));
                        newMinimodels[itemData.uid] = item;
                        item.flash();
                    }
                }
            }

            // Remove old models and corresponding views
            for (var uid in minimodels) { minimodels[uid].remove(); }
            minimodels = newMinimodels;

            // Trigger updates that are dependent on children
            for (var uid in minimodels) {
                if ('childDependentUpdate' in minimodels[uid])
                    minimodels[uid].childDependentUpdate();
            }
        };

        // Displays countdown then refreshes data
        function runRetryCountdown(secs, errorThrown) {
            var timeLeft = secs;
            var countdownTimer;
            countdownTimer = setInterval(function() {
                if (timeLeft >= 1) {
                    var msg = 'Refresh failed, retrying in ' + timeLeft +
                        (timeLeft === 1 ? ' second...' : ' seconds...');
                    viewAdapter.setStatusbar('error', errorThrown ? msg +
                        ' (' + errorThrown + ')' : msg);
                    timeLeft--;
                } else {
                    clearInterval(countdownTimer);
                    refreshData();
                }
            }, 1000);
        };

        // Gets updated location data
        function refreshData() {
            clearTimeout(refreshTimer);
            if (refreshRequest) refreshRequest.abort();
            viewAdapter.showStatusbar(true);
            viewAdapter.setStatusbar('busy', 'Refreshing data...');

            refreshRequest = jQuery.ajax({
                url: initLocationData.updateURL,
                dataType: 'json',
                success: function(data, textStatus, jqXHR) {
                    // Process new data and schedule next refresh
                    processUpdates(data);
                    refreshTimer = setTimeout(refreshData,
                                              refreshInterval * 1000);
                    viewAdapter.showStatusbar(false);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    // Display error message and retry
                    runRetryCountdown(refreshIntervalErr, errorThrown);
                }
            });
        };

        // POSTs given data to given URL, closing popup on success
        function postData(data, url, errorCallback) {
            if (postRequest) postRequest.abort();
            viewAdapter.enableButtons(false);
            viewAdapter.showPopupStatusbar(true);
            viewAdapter.setPopupStatusbar('busy', 'Sending request...');

            postRequest = jQuery.ajax({
                url: url,
                type: 'POST',
                data: data,
                dataType: 'json',
                success: function(data, textStatus, jqXHR) {
                    if (!data.accepted) {
                        // Bad data, display model validation errors
                        viewAdapter.enableButtons(true);
                        viewAdapter.showPopupStatusbar(false);
                        if (errorCallback) {
                            errorCallback(data.fieldErrors,
                                          data.nonFieldErrors);
                        }
                    } else {
                        // Update accepted, close popup and refresh data
                        viewAdapter.showPopup(false);
                        refreshData();
                    }
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    // Request failed, display error message
                    viewAdapter.setPopupConfirmText('Retry');
                    viewAdapter.enableButtons(true);
                    var msg = 'Request failed';
                    viewAdapter.showPopupStatusbar(true);
                    viewAdapter.setPopupStatusbar('error', errorThrown ? msg +
                        ' (' + errorThrown + ')' : msg);
                }
            });
        };

        // Gets the value of the specified cookie
        function getCookie(name) {
            var cookieValue = null;
            if (document.cookie && document.cookie != '') {
                var cookies = document.cookie.split(';');
                for (var i = 0; i < cookies.length; i++) {
                    var cookie = jQuery.trim(cookies[i]);
                    // Does this cookie string begin with the name we want?
                    if (cookie.substring(0, name.length + 1) == (name + '=')) {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            return cookieValue;
        }

        // Checks whether the given URL is same-origin
        // (relative to the current location)
        function sameOrigin(url) {
            // URL could be relative or scheme relative or absolute
            var host = document.location.host; // host + port
            var protocol = document.location.protocol;
            var sr_origin = '//' + host;
            var origin = protocol + sr_origin;
            // Allow absolute or scheme relative URLs to same origin
            return url == origin ||
                url.slice(0, origin.length + 1) == (origin + '/') ||
                url == sr_origin ||
                url.slice(0, sr_origin.length + 1) == (sr_origin + '/') ||
                // or any other URL that isn't scheme relative or absolute
                // i.e relative.
                !(/^(\/\/|http:|https:).*/.test(url));
        }

        // Checks whether the given method is non-destructive
        function safeMethod(method) {
            return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
        }


        // Main model initialization
        this.init = function(locationData, rInterval, rIntervalErr, adapter) {
            initLocationData = locationData;
            refreshInterval = rInterval ||  300;
            refreshIntervalErr = rIntervalErr || 30;
            csrftoken = getCookie('csrftoken');
            jQuery.ajaxSetup({
                beforeSend: function(xhr, settings) {
                    if (!safeMethod(settings.type) && sameOrigin(settings.url))
                        xhr.setRequestHeader('X-CSRFToken', csrftoken);
                }
            });
            viewAdapter = adapter;
        };

        // Main model start method
        // Sets up mini-models and starts refresh timer
        this.start = function() {
            var location = new LocationMiniModel(initLocationData);
            location.setViewAdapter(viewAdapter.makeLocationMiniViewAdapter(
                location, viewAdapter.append));
            minimodels[initLocationData.uid] = location;

            // Initialize mini-models
            for (var i = 0; i < initLocationData.categories.length; i++) {
                var categoryData = initLocationData.categories[i];
                var category = new CategoryMiniModel(categoryData,
                                                     initLocationData.uid);
                category.setViewAdapter(
                    viewAdapter.makeCategoryMiniViewAdapter(
                        category, jQuery.proxy(location.append, location)));
                minimodels[categoryData.uid] = category;

                for (var j = 0; j < categoryData.items.length; j++) {
                    var itemData = categoryData.items[j];
                    var item = new ItemMiniModel(itemData, categoryData.uid);
                    item.setViewAdapter(viewAdapter.makeItemMiniViewAdapter(
                        item, jQuery.proxy(category.append, category)));
                    minimodels[itemData.uid] = item;
                }
            }

            // Trigger updates that are dependent on children
            for (var uid in minimodels) {
                if ('childDependentUpdate' in minimodels[uid])
                    minimodels[uid].childDependentUpdate();
            }

            refreshTimer = setTimeout(refreshData, refreshInterval * 1000);
        };

        // Cancels last model update request
        this.cancelRequest = function() {
            if (postRequest) postRequest.abort();
        };
    }).apply(model);



    this.start = function(initData) {
        if (!started) {
            started = true;

            model.init(initData.location, initData.refreshInterval,
                       initData.refreshIntervalErr, {
                append: function(element) { view.append(element); },
                showStatusbar: function(bool) { view.showStatusbar(bool); },
                setStatusbar: function(sbclass, text) {
                    view.setStatusbar(sbclass, text);
                },
                showPopup: function(bool, title) {
                    view.showPopup(bool, title);
                },
                showLocationToggle: function(opening, confirmCallback) {
                    view.showLocationToggle(opening, confirmCallback);
                },
                showCategoryForm: function(name, hot, parent, confirmCallback) {
                    view.showCategoryForm(name, hot, parent, confirmCallback);
                },
                addCategoryErrors: function(fieldErrors, nonFieldErrors) {
                    view.addCategoryErrors(fieldErrors, nonFieldErrors);
                },
                showItemForm: function(name, qty, status,
                                       parent, confirmCallback) {
                    view.showItemForm(name, qty, status,
                                      parent, confirmCallback);
                },
                addItemErrors: function(fieldErrors, nonFieldErrors) {
                    view.addItemErrors(fieldErrors, nonFieldErrors);
                },
                showItemStatusForm: function(status, confirmCallback) {
                    view.showItemStatusForm(status, confirmCallback);
                },
                showDeletionWarning: function(model, name,
                                              ominous, confirmCallback) {
                    view.showDeletionWarning(model, name,
                                             ominous, confirmCallback);
                },
                enableButtons: function(bool) {
                    view.enableButtons(bool);
                },
                setPopupConfirmText: function(text) {
                    view.setPopupConfirmText(text);
                },
                showPopupStatusbar: function(bool) {
                    view.showPopupStatusbar(bool);
                },
                setPopupStatusbar: function(sbclass, text) {
                    view.setPopupStatusbar(sbclass, text);
                },
                makeLocationMiniViewAdapter: function(miniModel, attachCallback) {
                    var miniView = view.makeLocationMiniView({
                            showToggleDialog: function() {
                                miniModel.showToggleDialog();
                            },
                            showAddChildDialog: function() {
                                miniModel.showAddChildDialog();
                            }
                        }, attachCallback);
                    return {
                        update: function(name, open) {
                            miniView.update(name, open);
                        },
                        flash: function() { miniView.flash(); },
                        append: function(element) {
                            miniView.append(element);
                        },
                        remove: function() { miniView.remove(); }
                    };
                },
                makeCategoryMiniViewAdapter: function(miniModel, attachCallback) {
                    var miniView = view.makeCategoryMiniView({
                            showAddChildDialog: function() {
                                miniModel.showAddChildDialog();
                            },
                            showEditDialog: function() {
                                miniModel.showEditDialog();
                            },
                            showDeleteDialog: function() {
                                miniModel.showDeleteDialog();
                            }
                        }, attachCallback);
                    return {
                        update: function(name, hot, suppressFlash) {
                            miniView.update(name, hot, suppressFlash);
                        },
                        childDependentUpdate: function() {
                            miniView.childDependentUpdate();
                        },
                        flash: function() { miniView.flash(); },
                        append: function(element) {
                            miniView.append(element);
                        },
                        remove: function() { miniView.remove(); }
                    };
                },
                makeItemMiniViewAdapter: function(miniModel, attachCallback) {
                    var miniView = view.makeItemMiniView({
                            showEditDialog: function() {
                                miniModel.showEditDialog();
                            },
                            showSetAvailableDialog: function() {
                                miniModel.showSetAvailableDialog();
                            },
                            showSetUnavailableDialog: function() {
                                miniModel.showSetUnavailableDialog();
                            },
                            showDeleteDialog: function() {
                                miniModel.showDeleteDialog();
                            }
                        }, attachCallback);
                    return {
                        update: function(name, qty, status, suppressFlash) {
                            miniView.update(name, qty, status, suppressFlash);
                        },
                        flash: function() { miniView.flash(); },
                        remove: function() { miniView.remove(); }
                    };
                }
            });

            view.init(initData.UIURL, initData.userIsAuthenticated,
                initData.userCanChangeLocation, initData.userCanAddCategories,
                initData.userCanChangeCategories, initData.userCanDeleteCategories,
                initData.userCanAddItems, initData.userCanChangeItems,
                initData.userCanChangeItemStatuses, initData.userCanDeleteItems,
                {
                    start: function() { model.start(); },
                    cancelRequest: function() { model.cancelRequest(); }
                });
            view.start();
        }
    };
}).apply(hoot.food);

// On load, initialize with data from script tag
$(document).ready(function() {
    hoot.food.start($('#ajax-client-script').data('initData'));
});
