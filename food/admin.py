from django.contrib import admin
from food.models import Location, WeeklyClosure, OneTimeClosure

class WeeklyClosureInline(admin.TabularInline):
    model = WeeklyClosure
    extra = 1

class OneTimeClosureInline(admin.TabularInline):
    model = OneTimeClosure
    extra = 1

class LocationAdmin(admin.ModelAdmin):
    fields = ('name', 'uid')
    list_display = ('name', 'uid', 'open')
    inlines = (WeeklyClosureInline, OneTimeClosureInline)

admin.site.register(Location, LocationAdmin)
