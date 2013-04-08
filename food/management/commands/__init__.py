import uuid
from django.db.models import Q
from food.models import Category, Item, WeeklyClosure, OneTimeClosure

def get_closures(current_date):
    weekly_closures = set(
        vals['location_id'] for vals in WeeklyClosure.objects.filter(
            weekday=current_date.weekday())
        .values('location_id'))
    onetime_closures = set(
        vals['location_id'] for vals in OneTimeClosure.objects.filter(
            start_date__lte=current_date,
            end_date__gte=current_date)
        .values('location_id'))
    return (weekly_closures, onetime_closures)

def open_locations(locations, current_time):
    count = locations.update(open=True, last_modified=current_time)
    Item.objects.filter(parent__parent__in=locations).update(
        status='AVA', last_modified=current_time)
    do_hardcoded_menu_insertions(locations, current_time)
    return count

def close_locations(locations, current_time):
    count = locations.update(open=False, last_modified=current_time)
    do_hardcoded_menu_deletions(locations)
    return count

def do_hardcoded_menu_insertions(locations, current_time):
    if current_time.weekday() == 6:
        Item.objects.filter(parent__name='Chicken').update(status='OUT')
        Item.objects.bulk_create(
            [Item(
                uid=uuid.uuid4().hex,
                parent=cat,
                name='HBCB',
                status='AVA',
                last_modified=current_time)
            for cat in Category.objects.filter(
                name='Chicken',
                parent__in=locations)])
        Item.objects.bulk_create(
            [Item(
                uid=uuid.uuid4().hex,
                parent=cat,
                name='Specialty',
                status='AVA',
                last_modified=current_time)
            for cat in Category.objects.filter(
                name='Pizza',
                parent__in=locations)])

def do_hardcoded_menu_deletions(locations):
    Item.objects.filter(parent__parent__in=locations).filter(
        Q(name='HBCB') | Q(name='Specialty')).delete()
