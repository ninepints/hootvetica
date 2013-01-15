from django.conf.urls import patterns, include, url
from django.views.generic import ListView
from hoot.food.models import Location
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    (r'^accounts/login/$', 'django.contrib.auth.views.login'),
    (r'^accounts/logout/$', 'django.contrib.auth.views.logout'),
    (r'^accounts/pwchange/$', 'django.contrib.auth.views.password_change'),
    (r'^accounts/pwchange/done/$',
        'django.contrib.auth.views.password_change_done'),

    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    url(r'^admin/', include(admin.site.urls)),

    (r'^$', ListView.as_view(queryset=Location.objects.all(),
        template_name='overview.html')),
    (r'^', include('hoot.food.urls')),
    (r'^ajax/', include('hoot.food.urls_ajax')),
)
