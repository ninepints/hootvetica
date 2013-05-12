/* AJAX client launcher */

$(document).ready(function() {
    var model = ajaxClient.model;
    var view = ajaxClient.view;

    var start = function(initData) {
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
            showLocationForm: function(opening, confirmCallback) {
                view.showLocationForm(opening, confirmCallback);
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
            showDeletionPopup: function(model, name,
                                          warn, confirmCallback) {
                view.showDeletionPopup(model, name,
                                         warn, confirmCallback);
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
    };

    start(ajaxClient.initData);
});
