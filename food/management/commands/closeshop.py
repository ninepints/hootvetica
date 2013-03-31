from django.core.management.base import BaseCommand
from django.utils import timezone
from food.models import Location

class Command(BaseCommand):
    args = '[location ...]'
    help = ('Closes the specified locations, or all locations if none were '
            'specified.')

    def handle(self, *args, **options):
        if args:
            count = Location.objects.filter(uid__in=args).update(
                open=False,
                last_modified=timezone.now())
        else:
            count = Location.objects.all().update(
                open=False,
                last_modified=timezone.now())
        self.stdout.write(
            'Closed {} location{}'.format(count, '' if count == 1 else 's'))
