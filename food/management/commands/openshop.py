from optparse import make_option
from django.core.management.base import BaseCommand
from django.utils import timezone
from food.models import Location
from food.management.commands import get_closures, open_locations

class Command(BaseCommand):
    args = 'location ...'
    help = 'Opens the specified locations.'
    option_list = BaseCommand.option_list + (
        make_option('--force', dest='force', action='store_true', default=False,
                    help='Override active location closures'),
    )

    def handle(self, *args, **options):
        current_time = timezone.localtime(timezone.now())
        current_date = current_time.date()

        if not options['force']:
            weekly_closures, onetime_closures = get_closures(current_date)
            self.stdout.write('Active weekly closures: {}'.format(
                ', '.join(weekly_closures) if weekly_closures else '(none)'))
            self.stdout.write('Active one-time closures: {}'.format(
                ', '.join(onetime_closures) if onetime_closures else '(none)'))

            location_ids = set(args) - (weekly_closures | onetime_closures)
            locations = Location.objects.filter(uid__in=location_ids)
        else:
            locations = Location.objects.filter(uid__in=args)

        count = open_locations(locations, current_time)

        self.stdout.write(
            'Opened {} location{}'.format(count, '' if count == 1 else 's'))
