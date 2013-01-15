from django.contrib import admin
from hoot.food.models import Location

class LocationAdmin(admin.ModelAdmin):
    fields = ('name', 'uid', 'open')
    list_display = ('name', 'uid', 'open')
    list_editable = ('open',)

admin.site.register(Location, LocationAdmin)
