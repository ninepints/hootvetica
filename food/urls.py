from django.conf.urls import patterns, url
from django.views.generic import ListView
from food.views import LocationView, ItemUpdateView

urlpatterns = patterns('',
    (r'^$', ListView.as_view(queryset=Location.objects.all(),
        template_name='overview.html')),
    url(r'^location/(?P<pk>[\w-]+)/$', LocationView.as_view(),
        name='location'),
    url(r'^item/(?P<pk>\w+)/edit/$', ItemUpdateView.as_view(),
        name='item-edit'),
)
