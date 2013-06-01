/* AJAX client model code */

var ajaxClient = ajaxClient || {};
ajaxClient.model = {};


(function() {
    var viewAdapter;
    var refreshInterval = 300, refreshFailures = 0;
    var csrftoken;
    var initLocationData;

    // Location mini-model
    var location;

    // Timers for data refresh, refresh request object
    var refreshTimer, countdownTimer, refreshRequest;


    /* Note that for minimodels, this.viewAdapter is the minimodel to
     * miniview adapter, while viewAdapter is the main view adapter */

    function MiniModel(json, adapter) {
        this.viewAdapter = adapter;
        this.uid = json.uid;
        this.modified = 0;
        this.children = {};
    };

    MiniModel.prototype.initChildren = function(json) {
        var child;
        json.children.forEach(function(childJson) {
            var child = new this.childClass();
            child.init(childJson,
                this.buildChildViewAdapter(child, this.attachChild.bind(this)),
                this);
            this.children[child.uid] = child;
        }, this);
    };

    MiniModel.prototype.updateChildren = function(json, suppressFlash) {
        var newChildren = {};
        json.children.forEach(function(childJson) {
            if (this.children[childJson.uid]) {
                // Update existing child and move to new dictionary
                var child = this.children[childJson.uid];
                newChildren[child.uid] = child;
                delete this.children[child.uid];
                child.update(childJson, suppressFlash);
            }
            else {
                // Create new child
                var child = new this.childClass();
                child.init(childJson,
                    this.buildChildViewAdapter(child, this.attachChild.bind(this)),
                    this);
                newChildren[child.uid] = child;
                child.update(childJson);
            }
        }, this);

        // Remove children that no longer exist on the server
        Object.keys(this.children).forEach(function (uid) {
            this.children[uid].remove();
        }, this);
        this.children = newChildren;
    };

    MiniModel.prototype.attachChild = function(element) {
        this.viewAdapter.attachChild(element);
    };

    MiniModel.prototype.startAddChildRequest = function(data, statusAdapter) {
        var request = jQuery.ajax({
            url: this.addChildURL,
            type: 'POST',
            data: data + '&parent=' + this.uid,
            dataType: 'json',
            success: (function(data) {
                if (data.accepted) {
                    statusAdapter.accepted();
                    var child = new this.childClass();
                    child.init(data.newState,
                        this.buildChildViewAdapter(child,
                            this.attachChild.bind(this)),
                        this);
                    child.update(data.newState);
                    this.children[child.uid] = child;
                    this.viewAdapter.update();
                }
                else statusAdapter.rejected(data.errors);
            }).bind(this),
            error: buildAjaxErrorFunc(statusAdapter.error)
        });
        return request.abort;
    };

    MiniModel.prototype.startEditRequest = function(data, statusAdapter) {
        var request = jQuery.ajax({
            url: this.editURL,
            type: 'POST',
            data: data,
            dataType: 'json',
            success: (function(data) {
                if (data.accepted) {
                    statusAdapter.accepted();
                    this.update(data.newState);
                }
                else statusAdapter.rejected(data.errors);
            }).bind(this),
            error: buildAjaxErrorFunc(statusAdapter.error)
        });
        return request.abort;
    };


    function LocationMiniModel() {};
    LocationMiniModel.prototype = Object.create(MiniModel.prototype);
    LocationMiniModel.prototype.constructor = LocationMiniModel;
    LocationMiniModel.prototype.childClass = CategoryMiniModel;

    LocationMiniModel.prototype.init = function(json, adapter) {
        MiniModel.apply(this, arguments);

        if (json.children)
            this.initChildren(json);

        this.updateURL = json.updateURL;
        this.editURL = json.editURL;
        this.addChildURL = json.addChildURL;
    };

    LocationMiniModel.prototype.update = function(json, suppressFlash) {
        if (json.children)
            this.updateChildren(json, suppressFlash);
        if (json.modified > this.modified) {
            this.name = json.name;
            this.open = json.open;
            this.modified = json.modified;
            this.viewAdapter.update(json);
        }
        else this.viewAdapter.update();
    };

    LocationMiniModel.prototype.startToggleRequest =
            function(completionCallback) {
        jQuery.ajax({
            url: this.editURL,
            type: 'POST',
            data: 'open=' + !this.open,
            dataType: 'json',
            success: (function(data) {
                if (data.accepted) this.update(data.newState);
            }).bind(this),
            complete: completionCallback
        });
    };

    LocationMiniModel.prototype.refreshData = function(completionCallback) {
        refreshData(completionCallback);
    };

    LocationMiniModel.prototype.remove = function() {
        this.viewAdapter.remove();
    };


    function CategoryMiniModel() {};
    CategoryMiniModel.prototype = Object.create(MiniModel.prototype);
    CategoryMiniModel.prototype.constructor = CategoryMiniModel;
    CategoryMiniModel.prototype.childClass = ItemMiniModel;

    CategoryMiniModel.prototype.init = function(json, adapter, parent) {
        MiniModel.apply(this, arguments);

        if (json.children)
            this.initChildren(json);

        this.editURL = json.editURL;
        this.deleteURL = json.deleteURL;
        this.addChildURL = json.addChildURL;
        this.parent = parent;
    };

    CategoryMiniModel.prototype.update = function(json, suppressFlash) {
        if (json.children)
            this.updateChildren(json, suppressFlash);
        if (json.modified > this.modified) {
            this.name = json.name;
            this.heat = json.contents_hot;
            this.modified = json.modified;
            this.viewAdapter.update(json, suppressFlash);
        }
        else this.viewAdapter.update();
    };

    CategoryMiniModel.prototype.getState = function() {
        return {name: this.name, contents_hot: this.heat};
    };

    CategoryMiniModel.prototype.startDeleteRequest = function(statusAdapter) {
        var request = jQuery.ajax({
            url: this.deleteURL,
            type: 'POST',
            dataType: 'json',
            success: (function(data) {
                if (data.accepted) {
                    statusAdapter.accepted();
                    this.remove();
                }
                else statusAdapter.error('Server rejected update');
            }).bind(this),
            error: buildAjaxErrorFunc(statusAdapter.error)
        });
        return request.abort;
    };

    CategoryMiniModel.prototype.remove = function() {
        this.viewAdapter.remove();
        this.parent.viewAdapter.update();
    };


    function ItemMiniModel() {};
    ItemMiniModel.prototype = Object.create(MiniModel.prototype);
    ItemMiniModel.prototype.constructor = ItemMiniModel;

    ItemMiniModel.prototype.init = function(json, adapter, parent) {
        MiniModel.apply(this, arguments);

        this.editURL = json.editURL;
        this.editStatusURL = json.editStatusURL;
        this.deleteURL = json.deleteURL;
        this.parent = parent;
    };

    ItemMiniModel.prototype.update = function(json, suppressFlash) {
        if (json.modified > this.modified) {
            this.name = json.name;
            this.status = json.status;
            this.quantity = json.quantity;
            this.modified = json.modified;
            this.viewAdapter.update(json, suppressFlash);
        }
        else this.viewAdapter.update();
    };

    ItemMiniModel.prototype.getState = function() {
        return {name: this.name, status: this.status, quantity: this.quantity};
    };

    ItemMiniModel.prototype.startStatusRequest = function(status,
            completionCallback) {
        jQuery.ajax({
            url: this.editStatusURL,
            type: 'POST',
            data: 'status=' + status,
            dataType: 'json',
            success: (function(data) {
                if (data.accepted) this.update(data.newState);
            }).bind(this),
            complete: completionCallback
        });
    };

    ItemMiniModel.prototype.startDeleteRequest = function(completionCallback) {
        jQuery.ajax({
            url: this.deleteURL,
            type: 'POST',
            dataType: 'json',
            success: (function(data) {
                if (data.accepted) this.remove();
            }).bind(this),
            complete: completionCallback
        });
    };

    ItemMiniModel.prototype.remove = function() {
        this.viewAdapter.remove();
        this.parent.viewAdapter.update();
    };


    // Builds an ajax error handler that invokes the provided callback
    function buildAjaxErrorFunc(errorCallback) {
        return function(jqXHR, textStatus) {
            if (textStatus !== 'abort') {
                if (jqXHR.status && jqXHR.status !== 200)
                    errorCallback('Request failed (HTTP ' + jqXHR.status + ')');
                else if (textStatus)
                    errorCallback('Request failed (' + textStatus + ')');
                else
                    errorCallback('Request failed');
            }
        };
    };

    // Displays countdown then refreshes data
    function runRetryCountdown(secs, textStatus, httpStatus) {
        var timeLeft = secs;
        countdownTimer = setInterval(function() {
            if (timeLeft >= 1) {
                var msg = 'Refresh failed, retrying in ' + timeLeft +
                    (timeLeft === 1 ? ' second...' : ' seconds...');

                if (httpStatus && httpStatus !== 200)
                    msg += ' (HTTP ' + httpStatus +')';
                else if (textStatus)
                    msg += ' (' + textStatus +')';
                viewAdapter.setStatusbarContent(msg, 'error');
                timeLeft--;
            }
            else
                refreshData();
        }, 1000);
    };

    // Fetches updated location data
    function refreshData(completionCallback) {
        clearTimeout(refreshTimer);
        clearInterval(countdownTimer);
        if (refreshRequest) refreshRequest.abort();
        viewAdapter.setStatusbarVisible(true);
        viewAdapter.setStatusbarContent('Refreshing data...', 'busy');

        refreshRequest = jQuery.ajax({
            url: initLocationData.updateURL,
            dataType: 'json',
            success: function(data) {
                // Process new data and schedule next refresh
                refreshFailures = 0;
                location.update(data);
                refreshTimer = setTimeout(refreshData,
                                          refreshInterval * 1000);
                viewAdapter.setStatusbarVisible(false);
            },
            error: function(jqXHR, textStatus) {
                // Display error message and retry
                refreshFailures += 1;
                var wait = Math.round(
                    Math.random() * Math.pow(2, refreshFailures));
                runRetryCountdown(
                    wait > refreshInterval ? refreshInterval : wait,
                    textStatus, jqXHR.status);
            },
            complete: completionCallback
        });
    };


    this.init = function(locationData, rInterval, adapter) {
        initLocationData = locationData;
        refreshInterval = rInterval ||  refreshInterval;
        csrftoken = ajaxClient.utils.getCookie('csrftoken');
        jQuery.ajaxSetup({
            beforeSend: function(xhr, settings) {
                if (!ajaxClient.utils.safeMethod(settings.type) &&
                    ajaxClient.utils.sameOrigin(settings.url))
                    xhr.setRequestHeader('X-CSRFToken', csrftoken);
            }
        });
        viewAdapter = adapter;
        LocationMiniModel.prototype.buildChildViewAdapter =
            viewAdapter.makeCategoryMiniViewAdapter;
        CategoryMiniModel.prototype.buildChildViewAdapter =
            viewAdapter.makeItemMiniViewAdapter;
    };

    this.start = function() {
        location = new LocationMiniModel();
        location.init(initLocationData,
            viewAdapter.makeLocationMiniViewAdapter(
                location, viewAdapter.attachChild));
        location.update(initLocationData, true);
        refreshTimer = setTimeout(refreshData, refreshInterval * 1000);
    };
}).apply(ajaxClient.model);
