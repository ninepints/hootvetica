from django.contrib import admin
from food.models import Location

class LocationAdmin(admin.ModelAdmin):
    fields = ('name', 'uid', 'open')
    list_display = ('name', 'uid', 'open')

admin.site.register(Location, LocationAdmin)
