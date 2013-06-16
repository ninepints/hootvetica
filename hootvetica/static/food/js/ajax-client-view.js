/* AJAX client view code */

var ajaxClient = ajaxClient || {};
ajaxClient.view = {};


(function() {
    var modelAdapter;

    // User permissions
    var perms;

    // Existing page elements
    var body, contentDiv, statusbar, statusbarText, overlay;

    // URL for downloading UI elements
    var UIURL;

    // Downloaded elements
    var popupTemplate;
    var locationForm, categoryForm, itemForm;
    var locationTemplate, categoryTemplate, itemTemplate;

    // Stack of active popups (last popup is displayed)
    var popupStack = [];

    var nextInputID = 0;


    function Form(formElement, inputElements, state) {
        var input, id;
        this.formElement = formElement.on('submit', false);
        this.inputElements = inputElements || formElement.find('input, select');
        for (var i = 0; i < this.inputElements.length; i++) {
            id = 'input' + nextInputID;
            input = this.inputElements.eq(i).attr('id', id);
            input.parent().siblings().children('label').attr('for', id);
            nextInputID += 1;
        }

        if (state)
            Object.keys(state).forEach(function(name) {
                input = this.inputElements.filter('[name="' + name + '"]');
                if (input.is('[type="checkbox"]'))
                    input.prop('checked', state[name]).trigger('change');
                else if (input.is('[type="radio"]'))
                    input.filter('[value="' + state[name] + '"]')
                        .prop('checked', true).trigger('change');
                else
                    input.val(state[name]).trigger('change');
            }, this);
    };

    Form.prototype.attachAfter = function(element) {
        this.formElement.insertAfter(element);
    };

    Form.prototype.setEnabled = function(bool) {
        this.inputElements.prop('disabled', !bool);
    };

    Form.prototype.focusFirst = function() {
        this.inputElements.eq(0).focus();
    };

    Form.prototype.serialize = function() {
        return this.formElement.serialize();
    };

    Form.prototype.addErrors = function(json) {
        this.clearErrors();

        var nonFieldErrors = json.nonFieldErrors;
        var fieldErrors = json.fieldErrors;
        var formUl = this.formElement.children('ul.form');

        // Add non-field errors
        var prev = formUl.prev();
        nonFieldErrors.forEach(function(error) {
            if (prev.length == 0) {
                formUl.before('<li class="error">' + error + '</li>');
                prev = formUl.prev();
            }
            else {
                prev.after('<li class="error">' + error + '</li>');
                prev = prev.next();
            }
        });

        // Add field errors to associated fields
        fieldErrors.forEach(function(fieldError) {
            prev = formUl.find('[name="' + fieldError.field + '"]').parent();
            fieldError.errors.forEach(function(error) {
                prev.after('<li class="error">' + error + '</li>');
                prev = prev.next();
            });
        });
    };

    Form.prototype.clearErrors = function() {
        this.formElement.find('li.error').remove();
    };


    function Popup(title, confirmCallback, cancelCallback, content) {
        // Clone template markup
        this.container = popupTemplate.clone();
        this.container.on('click', function(event) {
            event.stopPropagation();
        });
        this.statusbar = this.container.children('div');

        // Add button event handlers
        this.confirmButton = this.container.find('a.confirm')
            .on('click', this.confirm.bind(this));
        this.cancelButton = this.container.find('a.cancel')
            .on('click', this.cancel.bind(this));
        this.confirmCallback = confirmCallback;
        this.cancelCallback = cancelCallback;
        this.disabled = false;

        // Add title, content
        this.container.children('h2').text(title);
        this.statusbar.after(content);

        // Attach to DOM
        this.container.appendTo(overlay);
    };

    Popup.prototype.setVisible = function(bool) {
        if (bool) this.container.show();
        else this.container.hide();
    };

    Popup.prototype.setStatusbarVisible = function(bool) {
        if (bool) this.statusbar.removeClass('hidden');
        else this.statusbar.addClass('hidden');
    };

    Popup.prototype.setStatusbarContent = function(content, sbclass) {
        this.statusbar.children('p').text(content);
        if (sbclass) {
            var wasHidden = this.statusbar.hasClass('hidden');
            this.statusbar.removeClass()
                .addClass('statusbar').addClass(sbclass);
            if (wasHidden)
                this.statusbar.addClass('hidden');
        }
    };

    Popup.prototype.setEnabled = function(bool) {
        this.disabled = !bool;
        if (bool)
            this.confirmButton.removeClass('disabled');
        else
            this.confirmButton.addClass('disabled');
    };

    Popup.prototype.setConfirmText = function(text) {
        this.confirmButton.text(text);
    };

    Popup.prototype.close = function() {
        popPopup();
        this.container.remove();
    };

    Popup.prototype.cancel = function(event) {
        this.cancelCallback();
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
    };

    Popup.prototype.confirm = function(event) {
        if (!this.disabled)
            this.confirmCallback();
        if (event) event.preventDefault();
    };


    function FormPopup(title, confirmCallback, cancelCallback, content, form) {
        Popup.apply(this, arguments);
        this.form = form;
        this.form.attachAfter(this.statusbar);
    };
    FormPopup.prototype = Object.create(Popup.prototype);
    FormPopup.prototype.constructor = FormPopup;

    FormPopup.prototype.setVisible = function(bool) {
        Popup.prototype.setVisible.apply(this, arguments);
        if (bool) this.form.focusFirst();
    };

    FormPopup.prototype.setEnabled = function(bool) {
        Popup.prototype.setEnabled.apply(this, arguments);
        this.form.setEnabled(bool);
    };

    FormPopup.prototype.confirm = function(event) {
        if (!this.disabled)
            this.confirmCallback(this.form.serialize());
        if (event) event.preventDefault();
    };

    FormPopup.prototype.getForm = function() {
        return this.form;
    };


    function MiniView(adapter) {
        this.modelAdapter = adapter;
        this.disabled = false;
    };

    MiniView.prototype.setEnabled = function(bool) {
        this.disabled = !bool;
        this.container.children('select').prop('disabled', !bool);
        if (bool)
            this.container.children('ul').find('a').removeClass('disabled');
        else
            this.container.children('ul').find('a').addClass('disabled');
    };

    MiniView.prototype.backgroundRequest = function(requestFunc) {
        this.setEnabled(false);
        requestFunc((function() {
            this.setEnabled(true);
        }).bind(this));
    };

    MiniView.prototype.launchPopup = function(title, content, requestFunc) {
        var popup, abortCallback;
        var miniview = this;

        popup = new Popup(title,

            // Popup confirmation callback
            function() {
                popup.setStatusbarContent('Sending request...', 'busy');
                popup.setStatusbarVisible(true);
                popup.setEnabled(false);
                abortCallback = requestFunc({
                    accepted: function() {
                        miniview.setEnabled(true);
                        popup.close();
                    },
                    error: function(error) {
                        abortCallback = null;
                        popup.setEnabled(true);
                        popup.setStatusbarContent(error, 'error');
                        popup.setStatusbarVisible(true);
                        popup.setConfirmText('Retry');
                    }
                });
            },

            // Popup cancellation callback
            function() {
                if (abortCallback)
                    abortCallback();
                miniview.setEnabled(true);
                popup.close();
            },

            content);

        this.setEnabled(false);
        pushPopup(popup);
        return popup;
    };

    MiniView.prototype.launchFormPopup = function(title, form, requestFunc) {
        var popup, abortCallback;
        var miniview = this;

        popup = new FormPopup(title,

            // Popup confirmation callback
            function(data) {
                popup.setStatusbarContent('Sending request...', 'busy');
                popup.setStatusbarVisible(true);
                popup.setEnabled(false);
                abortCallback = requestFunc(data, {
                    accepted: function() {
                        miniview.setEnabled(true);
                        popup.close();
                    },
                    rejected: function(json) {
                        abortCallback = null;
                        popup.setEnabled(true);
                        popup.setStatusbarVisible(false);
                        popup.getForm().addErrors(json);
                        popup.setConfirmText('Done');
                    },
                    error: function(error) {
                        abortCallback = null;
                        popup.setEnabled(true);
                        popup.setStatusbarContent(error, 'error');
                        popup.setStatusbarVisible(true);
                        popup.getForm().clearErrors();
                        popup.setConfirmText('Retry');
                    }
                });
            },

            // Popup cancellation callback
            function() {
                if (abortCallback)
                    abortCallback();
                miniview.setEnabled(true);
                popup.close();
            },

            '', form);

        this.setEnabled(false);
        pushPopup(popup);
        return popup;
    };


    function LocationMiniView(adapter, attachCallback) {
        MiniView.apply(this, arguments);

        // Clone template markup
        this.container = locationTemplate.clone();
        this.childrenDiv = this.container.children('div.categories');
        this.nameText = this.container.children('h1');
        this.emptyText = this.childrenDiv.children('h3').hide();
        this.closedBox = this.container.children('div.info');
        this.messageDiv = this.container.children('div.messagebar');
        this.messageText = this.messageDiv.children('p');
        this.treeModText = this.container.children('p').children('span');
        this.refreshText = this.container.children('p').children('a');

        // Customize "closed" banner
        if (perms.changeLocation) {
            this.closedBox.children('p').text('No information is visible' +
                ' to the public. You can open this location using the' +
                ' controls above.');
            this.closedBox.children('h3').remove();
        }
        else if (perms.authenticated) {
            this.closedBox.children('p').text('No information is visible' +
                ' to the public.');
            this.closedBox.children('h3').remove();
        }
        else
            this.closedBox.children('p').remove();

        // Button setup
        this.editButton = this.container.find('a.edit')
            .on('click', (function(event) {
                if (!this.disabled)
                    this.launchEditPopup();
                event.preventDefault();
            }).bind(this));
        this.addButton = this.container.find('a.add')
            .on('click', (function(event) {
                if (!this.disabled)
                    this.launchAddChildPopup();
                event.preventDefault();
            }).bind(this));
        if (!perms.changeLocation && !perms.addCategories)
            this.editButton.parent().parent().remove();
        else {
            this.container.addClass('editable');
            if (!perms.changeLocation)
                this.editButton.parent().remove();
            if (!perms.addCategories)
                this.addButton.parent().remove();
        }

        // Refresh button setup
        var refreshing = false;
        this.refreshText.on('click', (function(event) {
            if (!refreshing) {
                refreshing = true;
                this.refreshText.addClass('disabled').text('Refreshing...');
                ajaxClient.utils.sendGaEvent('button', 'click',
                    'manual_refresh');
                this.modelAdapter.refreshData((function() {
                    refreshing = false;
                    this.refreshText.removeClass('disabled')
                        .text('Refresh now');
                }).bind(this));
            }
            event.preventDefault();
        }).bind(this));

        // Attach self to DOM
        attachCallback(this.container);

        this.treeModTime = 0;
        setInterval(this.updateTreeModText.bind(this), 60000);
    };
    LocationMiniView.prototype = Object.create(MiniView.prototype);
    LocationMiniView.prototype.constructor = LocationMiniView;

    LocationMiniView.prototype.update = function(json) {
        if (json) {
            this.nameText.text(json.name);

            if (json.open)
                this.closedBox.addClass('hidden');
            else
                this.closedBox.removeClass('hidden');

            if (!json.open && !perms.authenticated)
                this.childrenDiv.add(this.messageDiv).addClass('hidden');
            else {
                this.childrenDiv.removeClass('hidden');
                if (json.message) {
                    this.messageText.text(json.message);
                    this.messageDiv.removeClass('hidden');
                }
                else
                    this.messageDiv.addClass('hidden');
            }
        }

        if (this.childrenDiv.children().length === 1)
            this.emptyText.show();
        else
            this.emptyText.hide();
    };

    LocationMiniView.prototype.setTreeModTime = function(time) {
        var newTime = time || ajaxClient.utils.getEpochTime();
        if (newTime > this.treeModTime) {
            this.treeModTime = newTime;
            this.updateTreeModText();
        };
    };

    LocationMiniView.prototype.updateTreeModText = function() {
        var delta = ajaxClient.utils.getEpochTime() - this.treeModTime;
        if (delta < 0) {
            this.treeModText.text('0 minutes ago');
            return;
        }

        var periods = [60 * 60 * 24 * 365,
                       60 * 60 * 24 * 30,
                       60 * 60 * 24 * 7,
                       60 * 60 * 24,
                       60 * 60,
                       60],
            periodNames = ['year', 'month', 'week',
                           'day', 'hour', 'minute'],
            deltas = [];
        for (var i = 0; i < periods.length; i++) {
            deltas.push(Math.floor(delta / periods[i]));
            delta %= periods[i];
        }

        var text = '';
        for (i = 0; i < periods.length; i++) {
            if (deltas[i] > 0) {
                text = deltas[i] + ' ' + periodNames[i] +
                    ((deltas[i] !== 1) ? 's' : '');
                break;
            }
        }
        if (i === 6)
            text = '0 minutes ago';
        else if (i < 5 && deltas[i + 1] > 0)
            text += ', ' + deltas[i + 1] + ' ' + periodNames[i + 1] +
                ((deltas[i + 1] !== 1) ? 's' : '') + ' ago';
        else
            text += ' ago'

        this.treeModText.text(text);
    };

    LocationMiniView.prototype.launchAddChildPopup = function() {
        this.launchFormPopup('Add category',
            new Form(categoryForm.clone(), null),
            this.modelAdapter.startAddChildRequest);
    };

    LocationMiniView.prototype.launchEditPopup = function() {
        this.launchFormPopup('Edit location',
            new Form(locationForm.clone(), null, this.modelAdapter.getState()),
            this.modelAdapter.startEditRequest);
    };

    LocationMiniView.prototype.attachChild = function(element) {
        this.emptyText.before(element);
    };

    LocationMiniView.prototype.remove = function() {
        this.container.remove();
    };


    function CategoryMiniView(adapter, attachCallback) {
        MiniView.apply(this, arguments);

        // Clone template markup
        this.container = categoryTemplate.clone();
        this.childrenDiv = this.container.children('div.items');
        this.nameText = this.container.children('h2');
        this.statusText = this.container.children('h3');

        // Setup collapsing
        this.nameText.on('click', (function() {
            if (!this.container.hasClass('empty'))
                this.container.toggleClass('collapsed');
        }).bind(this));

        // Setup buttons
        this.editButton = this.container.find('a.edit')
            .on('click', (function(event) {
                if (!this.disabled)
                    this.launchEditPopup();
                event.preventDefault();
            }).bind(this));
        this.deleteButton = this.container.find('a.delete')
            .on('click', (function(event) {
                if (!this.disabled)
                    this.launchDeletePopup();
                event.preventDefault();
            }).bind(this));
        this.addButton = this.container.find('a.add')
            .on('click', (function(event) {
                if (!this.disabled)
                    this.launchAddChildPopup();
                event.preventDefault();
            }).bind(this));
        if (!perms.changeCategories && !perms.deleteCategories &&
                !perms.addItems)
            this.editButton.parent().parent().remove();
        else {
            this.container.addClass('editable');
            if (!perms.changeCategories)
                this.editButton.parent().remove();
            if (!perms.deleteCategories)
                this.deleteButton.parent().remove();
            if (!perms.addItems)
                this.addButton.parent().remove();
        }

        // Attach self to DOM
        attachCallback(this.container);
    };
    CategoryMiniView.prototype = Object.create(MiniView.prototype);
    CategoryMiniView.prototype.constructor = CategoryMiniView;

    CategoryMiniView.prototype.update = function(json, suppressFlash) {
        if (json)
            this.nameText.text(json.name);

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

        if (json && !suppressFlash)
            this.flash();
    };

    CategoryMiniView.prototype.flash = function() {
        this.container.addClass('highlight slow-trans');
        setTimeout((function() {
            this.container.removeClass('highlight');
        }).bind(this), 50);
        setTimeout((function() {
            this.container.removeClass('slow-trans');
        }).bind(this), 3050);
    };

    CategoryMiniView.prototype.launchAddChildPopup = function() {
        this.launchFormPopup('Add item',
            new Form(buildItemForm(), null, {status: 'AVA'}),
            this.modelAdapter.startAddChildRequest);
    };

    CategoryMiniView.prototype.launchEditPopup = function() {
        this.launchFormPopup('Edit category',
            new Form(categoryForm.clone(), null, this.modelAdapter.getState()),
            this.modelAdapter.startEditRequest);
    };

    CategoryMiniView.prototype.launchDeletePopup = function() {
        this.launchPopup('Delete category',
            $('<p>Are you sure you want to delete the category "' +
                this.nameText.text() +
                '"? Any items in this category will also be deleted.</p>'),
            this.modelAdapter.startDeleteRequest).setConfirmText('Delete');
    };

    CategoryMiniView.prototype.attachChild = function(element) {
        this.childrenDiv.append(element);
    };

    CategoryMiniView.prototype.remove = function() {
        this.container.remove();
    };


    function ItemMiniView(adapter, attachCallback) {
        MiniView.apply(this, arguments);

        // Clone template markup
        this.container = itemTemplate.clone();
        this.nameText = this.container.children('h3');
        this.statusText = this.container.children('p');

        // Button setup
        this.statusSelect = this.container.children('select')
            .on('change', (function(event) {
                if (!this.disabled)
                    this.startStatusRequest(this.statusSelect.val());
            }).bind(this))
            .on('click', function(event) {
                event.stopPropagation();
            });
        this.editButton = this.container.find('a.edit')
            .on('click', (function(event) {
                if (!this.disabled)
                    this.launchEditPopup();
                event.preventDefault();
            }).bind(this));
        this.deleteButton = this.container.find('a.delete')
            .on('click', (function(event) {
                if (!this.disabled)
                    this.startDeleteRequest();
                event.preventDefault();
            }).bind(this));
        if (!perms.changeItems && !perms.deleteItems)
            this.editButton.parent().parent().remove();
        else {
            this.container.addClass('editable');
            if (!perms.changeItems)
                this.editButton.parent().remove();
            if (!perms.deleteItems)
                this.deleteButton.parent().remove();

            this.container.on('click', (function(event) {
                $('div.item.active').not(this.container)
                    .removeClass('active');
                this.container.addClass('active');
                event.stopPropagation();
            }).bind(this));
        }

        // Inline select setup
        if (!perms.changeItemStatuses && !perms.changeItems)
            this.statusSelect.remove();
        else {
            this.statusText.remove();
            this.statusText = this.statusSelect.children().eq(0);
        }

        // Attach self to DOM
        attachCallback(this.container);
    };
    ItemMiniView.prototype = Object.create(MiniView.prototype);
    ItemMiniView.prototype.constructor = ItemMiniView;

    ItemMiniView.prototype.update = function(json, suppressFlash) {
        if (json) {
            this.nameText.text(json.name);

            this.container.removeClass('low out');
            if (json.status === 'LOW')
                this.container.addClass('low');
            if (json.status === 'OUT')
                this.container.addClass('out');

            if (json.status === 'AVA')
                this.statusText.text('Available');
            else if (json.status === 'LOW')
                this.statusText.text('Running low');
            else if (json.status === 'OUT')
                this.statusText.text('Sold out');
            else if (json.status === 'QTY')
                this.statusText.text(json.quantity + ' left');

            if (perms.changeItemStatuses || perms.changeItems) {
                if (json.status === 'AVA' || json.status === 'OUT') {
                    this.statusSelect.val(json.status);
                    this.statusText.detach();
                }
                else if (json.status === 'LOW' || json.status === 'QTY') {
                    this.statusSelect.prepend(this.statusText);
                    this.statusText.prop('selected', true);
                }
            }
        }

        if (json && !suppressFlash)
            this.flash();
    };

    ItemMiniView.prototype.flash = function() {
        this.container.addClass('highlight');
        setTimeout((function() {
            this.container.removeClass('highlight');
        }).bind(this), 50);
    };

    ItemMiniView.prototype.launchEditPopup = function() {
        this.launchFormPopup('Edit item',
            new Form(buildItemForm(), null, this.modelAdapter.getState()),
            this.modelAdapter.startEditRequest);
    };

    ItemMiniView.prototype.startStatusRequest = function(status) {
        this.backgroundRequest((function(completionCallback) {
            this.modelAdapter.startStatusRequest(status, completionCallback);
        }).bind(this));
    };

    ItemMiniView.prototype.startDeleteRequest = function() {
        this.backgroundRequest(this.modelAdapter.startDeleteRequest);
    };

    ItemMiniView.prototype.remove = function() {
        this.container.remove();
    };


    function pushPopup(popup) {
        if (popupStack.length === 0) {
            body.addClass('noscroll');
            overlay.removeClass('hidden');
        }
        else {
            popupStack[popupStack.length - 1].setVisible(false);
        }
        popupStack.push(popup);
        popup.setVisible(true);
    };

    function popPopup() {
        var popup = popupStack.pop();
        popup.setVisible(false);
        if (popupStack.length === 0) {
            body.removeClass('noscroll');
            overlay.addClass('hidden');
        }
        else {
            popupStack[popupStack.length - 1].setVisible(true);
        }
    };

    function buildItemForm() {
        var formElement = itemForm.clone();
        var qtyField = formElement.find('[name="quantity"]');
        var qtyParent = qtyField.parent().parent().parent();
        formElement.find('select').on('change', function() {
            if ($(this).val() === 'QTY')
                qtyParent.show();
            else {
                qtyParent.hide();
                qtyField.val('');
            }
        });
        return formElement;
    };


    this.init = function(URL, permissions, adapter) {
        UIURL = URL;
        perms = permissions;
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
        this.setStatusbarVisible(true);
        this.setStatusbarContent('Loading UI...', 'busy');

        // Load UI
        jQuery.ajax({
            url: UIURL,
            dataType: 'html',

            success: (function(data) {
                staticUI.remove();

                // On success, process downloaded markup
                var components = $(data);
                popupTemplate = components.filter('div.popup');
                locationForm = components.filter('form.locationform');
                categoryForm = components.filter('form.categoryform');
                itemForm = components.filter('form.itemform');
                locationTemplate = components.filter('div.location');
                categoryTemplate = components.filter('div.category');
                itemTemplate = components.filter('div.item');

                overlay.on('click', function(event) {
                    if (popupStack.length > 0)
                        popupStack[popupStack.length - 1].cancel();
                    event.stopPropagation();
                });

                $(document).on('keyup', function(event) {
                    if (popupStack.length > 0) {
                        if (event.which === 13)
                            popupStack[popupStack.length - 1].confirm();
                        else if (event.which === 27)
                            popupStack[popupStack.length - 1].cancel();
                    }
                });

                body.on('click', function() {
                    $('div.item.active').removeClass('active');
                });

                // Done starting view, start model
                this.setStatusbarVisible(false);
                modelAdapter.start();
            }).bind(this),

            error: (function(jqXHR, textStatus) {
                // Load failed, redisplay static content
                var msg = 'Failed to load UI';
                if (jqXHR.status && jqXHR.status !== 200)
                    msg += ' (HTTP ' + jqXHR.status +')';
                else if (textStatus)
                    msg += ' (' + textStatus +')';
                this.setStatusbarContent(msg, 'error');
                setTimeout((function() {
                    this.setStatusbarVisible(false);
                }).bind(this), 10000);
                staticUI.show();
            }).bind(this)
        });
    };

    this.attachChild = function(element) {
        contentDiv.append(element)
    };

    this.setStatusbarVisible = function(bool) {
        if (bool) statusbar.removeClass('hidden');
        else statusbar.addClass('hidden');
    };

    this.setStatusbarContent = function(content, sbclass) {
        statusbar.children('p').text(content);
        if (sbclass) {
            var wasHidden = statusbar.hasClass('hidden');
            statusbar.removeClass().addClass('statusbar').addClass(sbclass);
            if (wasHidden)
                statusbar.addClass('hidden');
        }
    };

    // Accessors for mini-view constructors
    this.makeLocationMiniView = function(adapter, attachCallback) {
        return new LocationMiniView(adapter, attachCallback);
    };
    this.makeCategoryMiniView = function(adapter, attachCallback) {
        return new CategoryMiniView(adapter, attachCallback);
    };
    this.makeItemMiniView = function(adapter, attachCallback) {
        return new ItemMiniView(adapter, attachCallback);
    };
}).apply(ajaxClient.view);
