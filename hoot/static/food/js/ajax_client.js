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
            userCanAddItems, userCanChangeItems, userCanDeleteItems;

        // Existing page elements
        var body, contentDiv, statusbar, statusbarText;

        // URL for downloading UI elements
        var UIURL;

        // Downloaded elements
        var overlay, popupTitle, deletionWarning, formInputs;
        var locationForm, locationOpen;
        var categoryForm, categoryName, categoryParent;
        var itemForm, itemName, itemPrice, itemQty,
            itemQtyUl, itemStatus, itemParent;
        var confirmButton, cancelButton, buttonsEnabled;
        var popupStatusbar, popupStatusbarText;
        var locationHTML, categoryHTML, itemHTML;

        // Main statusbar display timer
        var statusbarTimer;

        // Local functions
        var qtyFieldVisCheck, setConfirmCallback, cancel;


        function LocationMiniView(miniModelAdapter, attachCallback) {
            // Clone/customize template markup and attach event handlers
            this.container = locationHTML.clone();
            this.nameText = this.container.find('h1');
            this.closedBox = this.container.children('div.colorbox.info');
            if (userCanChangeLocation)
                this.closedBox.children('p').text('This location is currently' +
                    ' closed, and no information is visible to the public.' +
                    ' You can open it using the controls above.');
            else if (userIsAuthenticated)
                this.closedBox.children('p').text('This location is currently' +
                    ' closed, and no information is visible to the public.');
            else
                this.closedBox.children('p').text('This location is currently' +
                    ' closed, but check back later!');

            this.childrenDiv = this.container.children('div.categories');
            this.toggleButton = this.container.find('a.toggle')
                .on('click', function() {
                    miniModelAdapter.showToggleDialog();
                    return false;
                });
            this.addButton = this.container.find('a.add')
                .on('click', function() {
                    miniModelAdapter.showAddChildDialog();
                    return false;
                });

            if (!userCanChangeLocation && !userCanAddCategories)
                this.toggleButton.parent().parent().remove();
            else
            {
                if (!userCanChangeLocation)
                    this.toggleButton.parent().remove();
                if (!userCanAddCategories)
                    this.addButton.parent().remove();
            }

            attachCallback(this.container);
        };

        LocationMiniView.prototype.update = function(name, open) {
            this.nameText.text(name);
            if (open) this.closedBox.addClass('hidden');
            else this.closedBox.removeClass('hidden');
            if (!open && !userIsAuthenticated) this.childrenDiv.hide();
            else this.childrenDiv.show();
            this.toggleButton.text(open ? 'Close Location' : 'Open Location');
        };

        LocationMiniView.prototype.prepend = function(element) {
            this.childrenDiv.prepend(element);
        };

        LocationMiniView.prototype.remove = function() {
            this.container.remove();
        };


        function CategoryMiniView(miniModelAdapter, attachCallback) {
            // Clone/customize template markup and attach event handlers
            this.container = categoryHTML.clone();
            this.headerDiv = this.container.children('div.categoryhead');
            this.nameText = this.headerDiv.children('h2');


            this.childrenDiv = this.container.children('div.items');
            this.editButton = this.container.find('a.edit')
                .on('click', function() {
                    miniModelAdapter.showEditDialog();
                    return false;
                });
            this.deleteButton = this.container.find('a.delete')
                .on('click', function() {
                    miniModelAdapter.showDeleteDialog();
                    return false;
                });
            this.addButton = this.container.find('a.add')
                .on('click', function() {
                    miniModelAdapter.showAddChildDialog();
                    return false;
                });

            if (!userCanChangeCategories && !userCanDeleteCategories &&
                    !userCanAddItems)
                this.editButton.parent().parent().remove();
            else
            {
                if (!userCanChangeCategories)
                    this.editButton.parent().remove();
                if (!userCanDeleteCategories)
                    this.deleteButton.parent().remove();
                if (!userCanAddItems)
                    this.addButton.parent().remove();
            }

            attachCallback(this.container);
        };

        CategoryMiniView.prototype.update = function(name, suppressFlash) {
            this.nameText.text(name);
            if (!suppressFlash) this.flash();
        };

        // Applies a highlight class for 50ms, which should fade slowly using
        // a CSS transition
        CategoryMiniView.prototype.flash = function() {
            this.headerDiv.addClass('highlight');
            setTimeout(jQuery.proxy(function() {
                this.headerDiv.removeClass('highlight');
            }, this), 50);
        };

        CategoryMiniView.prototype.prepend = function(element) {
            this.childrenDiv.prepend(element);
        };

        CategoryMiniView.prototype.remove = function() {
            this.container.remove();
        };


        function ItemMiniView(miniModelAdapter, attachCallback) {
            // Clone/customize template markup and attach event handlers
            this.container = itemHTML.clone();
            this.nameText = this.container.children('h3');
            this.statusSpan = this.container.find('span.status');
            this.priceSpan = this.container.find('span.price');

            this.editButton = this.container.find('a.edit')
                .on('click', function() {
                    miniModelAdapter.showEditDialog();
                    return false;
                });
            this.deleteButton = this.container.find('a.delete')
                .on('click', function() {
                    miniModelAdapter.showDeleteDialog();
                    return false;
                });

            if (!userCanChangeItems && !userCanDeleteItems)
                this.editButton.parent().parent().remove();
            else
            {
                if (!userCanChangeItems)
                    this.editButton.parent().remove();
                if (!userCanDeleteItems)
                    this.deleteButton.parent().remove();
            }

            attachCallback(this.container);
        };

        ItemMiniView.prototype.update = function(name, price, qty, status,
                suppressFlash) {
            this.nameText.text(name);
            this.statusSpan.removeClass('available low out');
            if (status === 'AVA') {
                this.statusSpan.text('Available');
                this.statusSpan.addClass('available');
            } else if (status === 'LOW') {
                this.statusSpan.text('Running Low');
                this.statusSpan.addClass('low');
            } else if (status === 'OUT') {
                this.statusSpan.text('Sold Out');
                this.statusSpan.addClass('out');
            } else if (status === 'QTY') this.statusSpan.text(qty + ' Left');
            else this.statusSpan.text('');
            if (price === '') this.priceSpan.text('');
            else if (parseFloat(price) === 0) this.priceSpan.text('Free');
            else this.priceSpan.text('$' + price);
            if (!suppressFlash) this.flash();
        };

        // Applies a highlight class for 50ms, which should fade slowly using
        // a CSS transition
        ItemMiniView.prototype.flash = function() {
            this.container.addClass('highlight');
            setTimeout(jQuery.proxy(function() {
                this.container.removeClass('highlight')
            }, this), 50);
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
            confirmButton.off('click').on('click', function() {
                if (buttonsEnabled) confirmCallback();
                return false;
            });
        };

        // Hides popup and cancels active request
        function cancel() {
            view.showPopup(false);
            modelAdapter.cancelRequest();
            return false;
        };


        // Main view initialization
        this.init = function(URL, authenticated, canChangeLocation,
                canAddCategories, canChangeCategories, canDeleteCategories,
                canAddItems, canChangeItems, canDeleteItems, adapter) {
            UIURL = URL;
            userIsAuthenticated = authenticated;
            userCanChangeLocation = canChangeLocation;
            userCanAddCategories = canAddCategories;
            userCanChangeCategories = canChangeCategories;
            userCanDeleteCategories = canDeleteCategories;
            userCanAddItems = canAddItems;
            userCanChangeItems = canChangeItems;
            userCanDeleteItems = canDeleteItems;
            modelAdapter = adapter;
            body = $('body');
            contentDiv = $('div#content');
            statusbar = $('div#content > div.statusbar');
            statusbarText = statusbar.children('p');
        };

        // Main view start
        // Downloads UI elements then starts model
        this.start = function() {
            // Hide static content
            var staticUI = contentDiv.children().not(statusbar).hide();
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
                    overlay = parsedData.filter('#overlay').on('click', cancel);
                    overlay.children('#popup').on('click', false);
                    popupTitle = overlay.find('div#popup > h2');
                    deletionWarning = overlay.find('div#popup > p');
                    formInputs = overlay.find('input, select');

                    locationForm = overlay.find('#locationform');
                    locationOpen = locationForm.children('input#open');
                    categoryForm = overlay.find('#categoryform');
                    categoryName = categoryForm.find('input#cname');
                    categoryParent = categoryForm.children('input#cparent');
                    itemForm = overlay.find('#itemform');
                    itemName = itemForm.find('input#iname');
                    itemPrice = itemForm.find('input#price');
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
                        .on('click', cancel);
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
                    locationHTML = parsedData.filter('div.location');
                    categoryHTML = parsedData.filter('div.category');
                    itemHTML = parsedData.filter('div.item');

                    overlay.insertAfter('div#container').hide();

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

        this.prepend = function(element) { contentDiv.prepend(element); };

        this.append = function(element) { contentDiv.append(element) };

        // Shows/hides the main statusbar
        this.showStatusbar = function(bool) {
            if (bool) {
                // Delay 250ms to avoid content jumping during short displays
                statusbarTimer = setTimeout(function() { statusbar.show(); },
                    250);
            } else {
                clearTimeout(statusbarTimer);
                statusbar.hide();
            }
        };

        // Gives the main statusbar the specified style and message
        this.setStatusbar = function(sbclass, text) {
            statusbar.removeClass().addClass('statusbar');
            statusbarText.text(text);
            if (sbclass) statusbar.addClass(sbclass);
        };

        // Hides or resets and displays the editing popup
        this.showPopup = function(bool, title) {
            if (bool) {
                popupTitle.text(title);
                this.enableButtons(true);
                this.setPopupConfirmText('Done');
                overlay.find('li.error').remove();
                deletionWarning.add(categoryForm).add(itemForm).hide();
                this.setPopupStatusbar('', '');
                body.addClass('noscroll');
                overlay.show();
            } else {
                this.enableButtons(false);
                overlay.hide();
                body.removeClass('noscroll');
            }
        };

        // Displays editing popup with given location information
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
        this.showCategoryForm = function(name, parent, confirmCallback) {
            this.showPopup(true, 'Edit Category');
            categoryForm.show();
            categoryName.val(name).focus().select();
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
        this.showItemForm = function(name, price, qty, status,
                                     parent, confirmCallback) {
            this.showPopup(true, 'Edit Item');
            itemForm.show();
            itemName.val(name).focus().select();
            itemPrice.val(price);
            itemQty.val(qty);
            itemStatus.val(status).change();
            itemParent.val(parent);
            setConfirmCallback(function() {
                itemPrice.val(itemPrice.val().replace('$', ''));
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
                else if (error.field === 'price') field = itemPrice.parent();
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

        // Displays delete confirmation dialog with given callback function
        this.showDeletionWarning = function(model, name,
                                            extraOminous, confirmCallback) {
            this.showPopup(true, 'Delete ' + model + ' "' + name + '"');
            deletionWarning.show();
            if (extraOminous) deletionWarning.text('Are you sure?' +
                ' Any children will be deleted as well.' +
                ' This action is permanent.');
            else deletionWarning.text('Are you sure?' +
                ' This action is permanent.');
            this.setPopupConfirmText('Delete');
            setConfirmCallback(confirmCallback);
        };

        // Enables or disables editing popup controls
        this.enableButtons = function(bool) {
            if (bool) {
                confirmButton.removeClass('disabled');
                buttonsEnabled = true;
                formInputs.removeAttr('disabled');
            } else {
                confirmButton.addClass('disabled');
                buttonsEnabled = false;
                formInputs.attr('disabled', 'disabled');
            }
        };

        // Sets the text on the editing popup confirm button
        this.setPopupConfirmText = function(text) {
            confirmButton.text(text);
        };

        // Gives the editing popup statusbar the specified style and message
        this.setPopupStatusbar = function(sbclass, text) {
            popupStatusbar.removeClass().addClass('statusbar');
            popupStatusbarText.text(text);
            if (sbclass) popupStatusbar.addClass(sbclass);
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

        // Location data parsed from script tag
        var initLocationData;

        // Dictionary of mini-models (uses UUIDs for keys)
        var minimodels = {};

        // Timer for data refresh and refresh request object
        var refreshTimer, refreshRequest;

        // Last model update request object
        var postRequest;

        // Local functions
        var processUpdates, runRetryCountdown, refreshData, postData;


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

        // Prepends an element to the model's view's children div
        LocationMiniModel.prototype.prepend = function(element) {
            this.viewAdapter.prepend(element);
        };

        // Sends a toggle dialog (and automatically sends toggle request)
        LocationMiniModel.prototype.showToggleDialog = function() {
            viewAdapter.showLocationToggle(!this.open,
                jQuery.proxy(this.confirmToggle, this));
        };

        // Sends a toggle request to the server
        LocationMiniModel.prototype.confirmToggle = function(data) {
            postData(data, this.editURL, function() {
                // This only gets invoked if the server rejects the update
                // request (so hopefully never)
                viewAdapter.setPopupStatusbar('error',
                            'Server rejected update');
            });
        };

        // Displays category add dialog
        LocationMiniModel.prototype.showAddChildDialog = function() {
            viewAdapter.showCategoryForm('New Category', this.uid,
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

        LocationMiniModel.prototype.flash = function() {
            this.viewAdapter.flash()
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
            this.viewAdapter.update(this.name, true);
        };

        // Prepends an element to the model's view's children div
        CategoryMiniModel.prototype.prepend = function(element) {
            this.viewAdapter.prepend(element);
        };

        // Displays item add dialog
        CategoryMiniModel.prototype.showAddChildDialog = function() {
            viewAdapter.showItemForm('New Item', '', '', 'AVA', this.uid,
                jQuery.proxy(this.confirmAddChild, this));
        };

        // Sends item add request to server
        CategoryMiniModel.prototype.confirmAddChild = function(data) {
            postData(data, this.addChildURL, viewAdapter.addItemErrors);
        };

        // Shows category edit dialog
        CategoryMiniModel.prototype.showEditDialog = function() {
            viewAdapter.showCategoryForm(this.name, this.parent,
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
                this.modified = json.modified;
                if (this.viewAdapter) this.viewAdapter.update(this.name);
            }
        };

        CategoryMiniModel.prototype.flash = function() {
            this.viewAdapter.flash();
        };

        CategoryMiniModel.prototype.remove = function() {
            this.viewAdapter.remove();
        };


        function ItemMiniModel(json, parent) {
            this.editURL = json.editURL;
            this.deleteURL = json.deleteURL;
            this.parent = parent;
            this.uid = json.uid;
            this.modified = 0;
            this.update(json);
        };

        ItemMiniModel.prototype.setViewAdapter = function(viewAdapter) {
            this.viewAdapter = viewAdapter;
            this.viewAdapter.update(this.name, this.price, this.qty,
                this.status, true);
        };

        // Displays item edit dialog
        ItemMiniModel.prototype.showEditDialog = function() {
            viewAdapter.showItemForm(this.name, this.price, this.qty,
                this.status, this.parent,
                jQuery.proxy(this.confirmEdit, this));
        };

        // Sends item edit request to server
        ItemMiniModel.prototype.confirmEdit = function(data) {
            postData(data, this.editURL, viewAdapter.addItemErrors);
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
                this.price = json.price;
                this.qty = json.quantity;
                this.status = json.status;
                this.modified = json.modified;
                if (this.viewAdapter)
                    this.viewAdapter.update(this.name, this.price,
                        this.qty, this.status);
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
                            jQuery.proxy(location.prepend, location)));
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
                            item, jQuery.proxy(category.prepend, category)));
                        newMinimodels[itemData.uid] = item;
                        item.flash();
                    }
                }
            }

            // Remove old models and corresponding views
            for (var uid in minimodels) { minimodels[uid].remove(); }
            minimodels = newMinimodels;
        };

        // Displays countdown then refreshes data
        function runRetryCountdown(secs, errorThrown) {
            var timeLeft = secs;
            var countdownTimer;
            countdownTimer = setInterval(function() {
                if (timeLeft >= 1) {
                    var msg = 'Refresh failed, retrying in ' + timeLeft +
                        ' seconds...';
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

        // POSTs given data to given url, closing popup on success
        function postData(data, url, errorCallback) {
            if (postRequest) postRequest.abort();
            viewAdapter.enableButtons(false);
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
                        viewAdapter.setPopupStatusbar('', '');
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
                    viewAdapter.setPopupStatusbar('error', errorThrown ? msg +
                        ' (' + errorThrown + ')' : msg);
                }
            });
        };


        // Main model initialization
        this.init = function(locationData, rInterval, rIntervalErr, adapter) {
            initLocationData = locationData;
            refreshInterval = rInterval ||  300;
            refreshIntervalErr = rIntervalErr || 30;
            viewAdapter = adapter;
        };

        // Main model start method
        // Sets up mini-models and starts refresh timer
        this.start = function() {
            var location = new LocationMiniModel(initLocationData);
            location.setViewAdapter(viewAdapter.makeLocationMiniViewAdapter(
                location, viewAdapter.append));
            minimodels[initLocationData.uid] = location;

            for (var i = 0; i < initLocationData.categories.length; i++) {
                var categoryData = initLocationData.categories[i];
                var category = new CategoryMiniModel(categoryData,
                                                     initLocationData.uid);
                category.setViewAdapter(
                    viewAdapter.makeCategoryMiniViewAdapter(
                        category, jQuery.proxy(location.prepend, location)));
                minimodels[categoryData.uid] = category;

                for (var j = 0; j < categoryData.items.length; j++) {
                    var itemData = categoryData.items[j];
                    var item = new ItemMiniModel(itemData, categoryData.uid);
                    item.setViewAdapter(viewAdapter.makeItemMiniViewAdapter(
                        item, jQuery.proxy(category.prepend, category)));
                    minimodels[itemData.uid] = item;
                }
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
                prepend: function(element) { view.prepend(element); },
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
                showCategoryForm: function(name, parent, confirmCallback) {
                    view.showCategoryForm(name, parent, confirmCallback);
                },
                addCategoryErrors: function(fieldErrors, nonFieldErrors) {
                    view.addCategoryErrors(fieldErrors, nonFieldErrors);
                },
                showItemForm: function(name, price, qty, status,
                                       parent, confirmCallback) {
                    view.showItemForm(name, price, qty, status,
                                      parent, confirmCallback);
                },
                addItemErrors: function(fieldErrors, nonFieldErrors) {
                    view.addItemErrors(fieldErrors, nonFieldErrors);
                },
                showDeletionWarning: function(model, name,
                                              extraOminous, confirmCallback) {
                    view.showDeletionWarning(model, name,
                                             extraOminous, confirmCallback);
                },
                enableButtons: function(bool) {
                    view.enableButtons(bool);
                },
                setPopupConfirmText: function(text) {
                    view.setPopupConfirmText(text);
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
                        prepend: function(element) {
                            miniView.prepend(element);
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
                        update: function(name, suppressFlash) {
                            miniView.update(name, suppressFlash);
                        },
                        flash: function() { miniView.flash(); },
                        prepend: function(element) {
                            miniView.prepend(element);
                        },
                        remove: function() { miniView.remove(); }
                    };
                },
                makeItemMiniViewAdapter: function(miniModel, attachCallback) {
                    var miniView = view.makeItemMiniView({
                            showEditDialog: function() {
                                miniModel.showEditDialog();
                            },
                            showDeleteDialog: function() {
                                miniModel.showDeleteDialog();
                            }
                        }, attachCallback);
                    return {
                        update: function(name, price, qty, status,
                                suppressFlash) {
                            miniView.update(name, price, qty, status,
                                suppressFlash);
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
                initData.userCanDeleteItems,
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
    hoot.food.start($('#food').data('initData'));
});
