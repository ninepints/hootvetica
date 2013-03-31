from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.conf import settings
from food.models import Location, Item, WeeklyClosure, OneTimeClosure

class Command(BaseCommand):
    args = '[location ...]'
    help = ('Opens the specified locations (or all locations if none were '
            'specified) if the current day of the week is an "open" day.')

    def handle(self, *args, **options):
        current_date = timezone.localtime(timezone.now()).date()

        if args:
            for location_id in args:
                try:
                    location = Location.objects.get(pk=location_id)
                except Location.DoesNotExist:
                    raise CommandError(
                        'Location {} does not exist'.format(location_id))

                location.open = True
                location.save()
                Item.objects.filter(parent__parent_id=location.uid).update(
                    status='AVA', last_modified=timezone.now())
                self.stdout.write('Opened location {}'.format(location_id))

        else:
            for location in Location.objects.all():
                if WeeklyClosure.objects.filter(
                        location_id=location.uid,
                        weekday=current_date.weekday()).count() > 0:
                    self.stdout.write(
                        'Not opening location {} '
                        'due to weekly closure'.format(location.uid))
                    continue
                elif OneTimeClosure.objects.filter(
                        location_id=location.uid,
                        start_date__lte=current_date,
                        end_date__gte=current_date).count() > 0:
                    self.stdout.write(
                        'Not opening location {} '
                        'due to one-time closure'.format(location.uid))
                    continue

                location.open = True
                location.save()
                Item.objects.filter(parent__parent_id=location.uid).update(
                    status='AVA', last_modified=timezone.now())
                self.stdout.write('Opened location {}'.format(location.uid))
