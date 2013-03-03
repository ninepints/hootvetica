from django.conf.urls import patterns, url
from django.views.generic import ListView
from food.models import Location
from food.views import (LocationView, LocationUpdateView, CategoryCreateView,
                        CategoryUpdateView,CategoryDeleteView, ItemCreateView,
                        ItemUpdateView, ItemStatusUpdateView, ItemDeleteView)

urlpatterns = patterns('',
    url(r'^$', ListView.as_view(queryset=Location.objects.all(),
        template_name='food/index.html'), name='index'),

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
    url(r'^item/(?P<pk>\w+)/edit-status/$', ItemStatusUpdateView.as_view(),
        name='item-edit-status'),
    url(r'^item/(?P<pk>\w+)/delete/$', ItemDeleteView.as_view(),
        name='item-del'),
)
