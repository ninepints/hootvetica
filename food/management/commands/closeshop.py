from django.core.management.base import BaseCommand
from django.utils import timezone
from food.models import Location
from food.management.commands import close_locations

class Command(BaseCommand):
    args = 'location ...'
    help = 'Closes the specified locations.'

    def handle(self, *args, **options):
        current_time = timezone.localtime(timezone.now())
        locations = Location.objects.filter(uid__in=args)
        count = close_locations(locations, current_time)

        self.stdout.write(
            'Closed {} location{}'.format(count, '' if count == 1 else 's'))
