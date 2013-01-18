from django.conf.urls import patterns, url
from django.views.generic import TemplateView
from food.views import LocationAjaxView, ItemAjaxUpdateView

urlpatterns = patterns('',
    url(r'^ui/$', TemplateView.as_view(template_name='food/ajax_ui.html'),
        name='ajax-ui'),
    url(r'^location/(?P<pk>[\w-]+)/$', LocationAjaxView.as_view(),
        name='location-ajax'),
    url(r'^item/(?P<pk>\w+)/edit/$', ItemAjaxUpdateView.as_view(),
        name='item-edit-ajax'),
)
