from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from food.models import Location

class Command(BaseCommand):
    args = '[location ...]'
    help = ('Closes the specified locations, or all locations if none were '
            'specified.')

    def handle(self, *args, **options):
        if args:
            for location_id in args:
                try:
                    location = Location.objects.get(pk=location_id)
                except Location.DoesNotExist:
                    raise CommandError(
                        'Location {} does not exist'.format(location_id))

                location.open = False
                location.save()
                self.stdout.write('Closed location {}'.format(location_id))
        else:
            Location.objects.all().update(
                open=False,
                last_modified=timezone.now())
            self.stdout.write('Closed all locations')
