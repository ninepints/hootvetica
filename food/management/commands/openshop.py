import uuid
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings
from food.models import Location, Category, Item, WeeklyClosure, OneTimeClosure

class Command(BaseCommand):
    args = '[location ...]'
    help = ('Opens the specified locations or, if no locations were specified '
            'and the current time is less than one minute after '
            'settings.OPEN_TIME, opens all locations with no associated '
            'closures corresponding to the current date.')

    def handle(self, *args, **options):
        current_time = timezone.localtime(timezone.now())
        current_date = current_time.date()

        if args:
            locations = Location.objects.filter(uid__in=args)
            count = locations.update(open=True, last_modified=current_time)
            Item.objects.filter(parent__parent__in=locations).update(
                status='AVA', last_modified=current_time)

        elif (current_time.hour, current_time.minute) != settings.OPEN_TIME:
            self.stdout.write('Exiting: current time ({0}) is not open time '
                '({1[0]:02}:{1[1]:02})'.format(
                    current_time, settings.OPEN_TIME))
            return

        else:
            weekly_closures = set(
                vals['location_id'] for vals in WeeklyClosure.objects.filter(
                    weekday=current_date.weekday()).values('location_id'))
            onetime_closures = set(
                vals['location_id'] for vals in OneTimeClosure.objects.filter(
                    start_date__lte=current_date, end_date__gte=current_date)
                .values('location_id'))

            self.stdout.write('Active weekly closures: {}'.format(
                ', '.join(weekly_closures) if weekly_closures else '(none)'))
            self.stdout.write('Active one-time closures: {}'.format(
                ', '.join(onetime_closures) if onetime_closures else '(none)'))

            location_ids = (
                set(vals['uid'] for vals in Location.objects.values('uid')) -
                (weekly_closures | onetime_closures)
            )

            locations = Location.objects.filter(uid__in=location_ids)
            count = locations.update(open=True, last_modified=current_time)
            Item.objects.filter(parent__parent__in=locations).update(
                status='AVA', last_modified=current_time)

        self.do_hardcoded_menu_updates(current_time)
        self.stdout.write(
            'Opened {} location{}'.format(count, '' if count == 1 else 's'))

    def do_hardcoded_menu_updates(self, current_time):
        # This could be nicer (i.e. not hardcoded) but I don't think
        # doing it properly is worth the time commitment

        if current_time.weekday() == 6:
            Item.objects.bulk_create([Item(
                uid=uuid.uuid4().hex, parent=cat, name='HBCB',
                status='AVA', last_modified=current_time)
            for cat in Category.objects.filter(name='Chicken')])
            Item.objects.bulk_create([Item(
                uid=uuid.uuid4().hex, parent=cat, name='Specialty',
                status='AVA', last_modified=current_time)
            for cat in Category.objects.filter(name='Pizza')])

