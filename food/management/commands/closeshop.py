from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone
from django.conf import settings
from food.models import Location, Item

class Command(BaseCommand):
    args = '[location ...]'
    help = ('Closes the specified locations or, if no locations were specified '
            'and the current time is less than one minute after '
            'settings.CLOSE_TIME, closes all locations.')

    def handle(self, *args, **options):
        current_time = timezone.localtime(timezone.now())

        if args:
            count = Location.objects.filter(uid__in=args).update(
                open=False,
                last_modified=timezone.now())
        elif (current_time.hour, current_time.minute) != settings.CLOSE_TIME:
            self.stdout.write('Exiting: current time ({0}) is not close time '
                '({1[0]:02}:{1[1]:02})'.format(
                    current_time, settings.CLOSE_TIME))
            return
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
