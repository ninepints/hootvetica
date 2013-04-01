from django.core.management.base import NoArgsCommand
from django.utils import timezone
from django.conf import settings
from food.models import Location
from food.management.commands import (get_closures, open_locations,
    close_locations)

class Command(NoArgsCommand):
    help = ('Opens or closes all locations if the current time coincides with '
            'settings.OPEN_TIME or settings.CLOSE_TIME. Locations with '
            'associated active closures will not be opened.')

    def handle_noargs(self, **options):
        current_time = timezone.localtime(timezone.now())
        current_date = current_time.date()

        if (current_time.hour, current_time.minute) == settings.OPEN_TIME:
            weekly_closures, onetime_closures = get_closures(current_date)
            self.stdout.write('Active weekly closures: {}'.format(
                ', '.join(weekly_closures) if weekly_closures else '(none)'))
            self.stdout.write('Active one-time closures: {}'.format(
                ', '.join(onetime_closures) if onetime_closures else '(none)'))

            closure_set = weekly_closures | onetime_closures
            locations = Location.objects.exclude(uid__in=closure_set)
            count = open_locations(locations, current_time)

            self.stdout.write(
                'Opened {} location{}'.format(count, '' if count == 1 else 's'))

        elif (current_time.hour, current_time.minute) == settings.CLOSE_TIME:
            locations = Location.objects.all()
            count = close_locations(locations, current_time)

            self.stdout.write(
                'Closed {} location{}'.format(count, '' if count == 1 else 's'))

        else:
            self.stdout.write('Exiting: current time ({0}) is not OPEN_TIME '
                '({1[0]:02}:{1[1]:02}) or CLOSE_TIME ({2[0]:02}:{2[1]:02})'
                .format(current_time, settings.OPEN_TIME, settings.CLOSE_TIME))
