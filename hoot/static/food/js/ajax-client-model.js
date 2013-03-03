/* AJAX client model code */

var ajaxClient = ajaxClient || {};
ajaxClient.model = {};


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
        viewAdapter.showLocationForm(!this.open,
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

    LocationMiniModel.prototype.childDependentUpdate = function() {
        this.viewAdapter.childDependentUpdate();
    }

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
            }
            else {
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
                }
                else {
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
            }
            else {
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
                }
                else {
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
}).apply(ajaxClient.model);
