from django.conf.urls import patterns, url
from django.views.generic import TemplateView
from food.views import (LocationAjaxView, LocationAjaxUpdateView,
                        CategoryAjaxCreateView, CategoryAjaxUpdateView,
                        CategoryAjaxDeleteView, ItemAjaxCreateView,
                        ItemAjaxUpdateView, ItemAjaxDeleteView)

urlpatterns = patterns('',
    url(r'^ui/$', TemplateView.as_view(template_name='food/ajax_ui.html'),
        name='ajax-ui'),

    url(r'^location/(?P<pk>[\w-]+)/$', LocationAjaxView.as_view(),
        name='location-ajax'),
    url(r'^location/(?P<pk>[\w-]+)/edit/$', LocationAjaxUpdateView.as_view(),
        name='location-edit-ajax'),

    url(r'^category/add/$', CategoryAjaxCreateView.as_view(),
        name='category-add-ajax'),
    url(r'^category/(?P<pk>\w+)/edit/$', CategoryAjaxUpdateView.as_view(),
        name='category-edit-ajax'),
    url(r'^category/(?P<pk>\w+)/delete/$', CategoryAjaxDeleteView.as_view(),
        name='category-del-ajax'),

    url(r'^item/add/$', ItemAjaxCreateView.as_view(),
        name='item-add-ajax'),
    url(r'^item/(?P<pk>\w+)/edit/$', ItemAjaxUpdateView.as_view(),
        name='item-edit-ajax'),
    url(r'^item/(?P<pk>\w+)/delete/$', ItemAjaxDeleteView.as_view(),
        name='item-del-ajax'),
)
