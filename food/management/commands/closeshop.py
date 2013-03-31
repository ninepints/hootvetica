from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone
from food.models import Location, Item

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
        self.do_hardcoded_menu_updates()
        self.stdout.write(
            'Closed {} location{}'.format(count, '' if count == 1 else 's'))

    def do_hardcoded_menu_updates(self):
        # This could be nicer (i.e. not hardcoded) but I don't think
        # doing it properly is worth the time commitment

        Item.objects.filter(Q(name='HBCB') | Q(name='Specialty')).delete()
