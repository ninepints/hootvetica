/* AJAX client controller
 * I probably overdid it with the adapter pattern */

$(document).ready(function() {
    var model = ajaxClient.model;
    var view = ajaxClient.view;

    var start = function(initData) {
        model.init(initData.location, initData.refreshInterval,
            {
                // Main view adapter
                attachChild: function(element) {
                    view.attachChild(element);
                },
                setStatusbarVisible: function(bool) {
                    view.setStatusbarVisible(bool);
                },
                setStatusbarContent: function(content, sbclass) {
                    view.setStatusbarContent(content, sbclass);
                },
                makeLocationMiniViewAdapter: function(miniModel,
                        attachCallback) {
                    var miniView = view.makeLocationMiniView({
                            // Location mini-model adapter
                            startAddChildRequest: function(data,
                                    statusAdapter) {
                                return miniModel.startAddChildRequest(data, {
                                    accepted: function() {
                                        statusAdapter.accepted();
                                    },
                                    rejected: function(json) {
                                        statusAdapter.rejected(json);
                                    },
                                    error: function(error) {
                                        statusAdapter.error(error);
                                    }
                                });
                            },
                            startToggleRequest: function(completionCallback) {
                                miniModel.startToggleRequest(
                                    completionCallback);
                            },
                            refreshData: function(completionCallback) {
                                miniModel.refreshData(completionCallback);
                            }
                        }, attachCallback);
                    return {
                        // Location mini-view adapter
                        update: function(json) {
                            miniView.update(json);
                        },
                        attachChild: function(element) {
                            miniView.attachChild(element);
                        },
                        remove: function() {
                            miniView.remove();
                        }
                    };
                },
                makeCategoryMiniViewAdapter: function(miniModel,
                        attachCallback) {
                    var miniView = view.makeCategoryMiniView({
                            // Category mini-model adpter
                            getState: function() {
                                return miniModel.getState();
                            },
                            startAddChildRequest: function(data,
                                    statusAdapter) {
                                return miniModel.startAddChildRequest(data, {
                                    accepted: function() {
                                        statusAdapter.accepted();
                                    },
                                    rejected: function(json) {
                                        statusAdapter.rejected(json);
                                    },
                                    error: function(error) {
                                        statusAdapter.error(error);
                                    }
                                });
                            },
                            startEditRequest: function(data, statusAdapter) {
                                return miniModel.startEditRequest(data, {
                                    accepted: function() {
                                        statusAdapter.accepted();
                                    },
                                    rejected: function(json) {
                                        statusAdapter.rejected(json);
                                    },
                                    error: function(error) {
                                        statusAdapter.error(error);
                                    }
                                });
                            },
                            startDeleteRequest: function(statusAdapter) {
                                return miniModel.startDeleteRequest({
                                    accepted: function() {
                                        statusAdapter.accepted();
                                    },
                                    error: function(error) {
                                        statusAdapter.error(error);
                                    }
                                });
                            }
                        }, attachCallback);
                    return {
                        // Category mini-view adapter
                        update: function(json, suppressFlash) {
                            miniView.update(json, suppressFlash);
                        },
                        flash: function() {
                            miniView.flash();
                        },
                        attachChild: function(element) {
                            miniView.attachChild(element);
                        },
                        remove: function() {
                            miniView.remove();
                        }
                    };
                },
                makeItemMiniViewAdapter: function(miniModel, attachCallback) {
                    var miniView = view.makeItemMiniView({
                            // Item mini-model adapter
                            getState: function() {
                                return miniModel.getState();
                            },
                            startEditRequest: function(data, statusAdapter) {
                                return miniModel.startEditRequest(data, {
                                    accepted: function() {
                                        statusAdapter.accepted();
                                    },
                                    rejected: function(json) {
                                        statusAdapter.rejected(json);
                                    },
                                    error: function(error) {
                                        statusAdapter.error(error);
                                    }
                                });
                            },
                            startStatusRequest: function(status,
                                    completionCallback) {
                                miniModel.startStatusRequest(status,
                                    completionCallback);
                            },
                            startDeleteRequest: function(completionCallback) {
                                miniModel.startDeleteRequest(
                                    completionCallback);
                            }
                        }, attachCallback);
                    return {
                        // Item mini-view adapter
                        update: function(json, suppressFlash) {
                            miniView.update(json, suppressFlash);
                        },
                        flash: function() {
                            miniView.flash();
                        },
                        remove: function() {
                            miniView.remove();
                        }
                    };
                }
            });

        view.init(initData.UIURL, initData.perms, {
                // Main model adapter
                start: function() { model.start(); }
            });
        view.start();
    };

    start(ajaxClient.initData);
});
