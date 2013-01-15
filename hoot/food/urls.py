from django.conf.urls import patterns, url
from hoot.food.views import (LocationView, LocationUpdateView,
                             CategoryCreateView, CategoryUpdateView,
                             CategoryDeleteView, ItemCreateView,
                             ItemUpdateView, ItemDeleteView)

urlpatterns = patterns('',
    url(r'^location/(?P<pk>[\w-]+)/$', LocationView.as_view(),
        name='location'),
    url(r'^location/(?P<pk>[\w-]+)/edit/$', LocationUpdateView.as_view(),
        name='location-edit'),

    url(r'^category/add/$', CategoryCreateView.as_view(),
        name='category-add'),
    url(r'^category/(?P<pk>\w+)/edit/$', CategoryUpdateView.as_view(),
        name='category-edit'),
    url(r'^category/(?P<pk>\w+)/delete/$', CategoryDeleteView.as_view(),
        name='category-del'),

    url(r'^item/add/$', ItemCreateView.as_view(),
        name='item-add'),
    url(r'^item/(?P<pk>\w+)/edit/$', ItemUpdateView.as_view(),
        name='item-edit'),
    url(r'^item/(?P<pk>\w+)/delete/$', ItemDeleteView.as_view(),
        name='item-del'),
)
