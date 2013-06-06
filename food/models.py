import uuid
from django.db import models
from django.db.models.loading import get_model
from django.core.validators import validate_slug
from django.core.exceptions import ValidationError

class Location(models.Model):
    uid = models.CharField(
        'ID',
        max_length=24,
        primary_key=True,
        validators=[validate_slug],
        help_text=('The unique ID of this location, which will determine the '
        'location\'s URL. For instance, entering "foo" would yield something '
        'like "example.com/location/foo/".'))
    name = models.CharField(max_length=32)
    open = models.BooleanField()
    last_modified = models.DateTimeField(auto_now=True, editable=False)

    def get_location_uid(self):
        return self.uid

    def hot_food_available(self):
        item_class = get_model('food', 'Item')
        return (item_class.objects.filter(parent__parent_id=self.uid)
                            .filter(parent__contents_hot=True)
                            .exclude(status='OUT')
                            .exists())

    def get_tree_last_modified(self):
        categories = self.category_set.select_related()
        items = (item for category in categories
                 for item in category.item_set.all())

        # These values are only compared if no child categories/items exist.
        # Reusing this location's modification timestamp instead of datetime.min
        # saves us some timezone math
        category_max, item_max = self.last_modified, self.last_modified

        try:
            category_max = max(categories,
                               key=lambda x: x.last_modified).last_modified
            item_max = max(items,
                           key=lambda x: x.last_modified).last_modified
        except ValueError:
            pass
        return max(self.last_modified, category_max, item_max)


    @models.permalink
    def get_absolute_url(self):
        return ('location', (), {'pk': self.uid})

    def __unicode__(self):
        return self.name

    class Meta:
        ordering = ('name',)
        permissions = (('set_location_status', 'Can open/close location'),)


class Category(models.Model):
    uid = models.CharField('UUID', max_length=32,
                           editable=False, primary_key=True)
    parent = models.ForeignKey(Location)
    name = models.CharField(max_length=32)
    contents_hot = models.BooleanField()
    last_modified = models.DateTimeField(auto_now=True, editable=False)

    def get_location_uid(self):
        return self.parent.uid

    def food_available(self):
        return self.item_set.exclude(status='OUT').exists()

    def clean(self):
        if not self.uid:
            self.uid = uuid.uuid4().hex

    def __unicode__(self):
        return self.name

    class Meta:
        ordering = ('-contents_hot', 'name')
        verbose_name_plural = 'categories'


class Item(models.Model):
    uid = models.CharField('UUID', max_length=32,
                           editable=False, primary_key=True)
    parent = models.ForeignKey(Category)
    name = models.CharField(max_length=32)
    status = models.CharField(max_length=3, choices=(
        ('AVA', 'Available'),
        ('LOW', 'Running low'),
        ('OUT', 'Sold out'),
        ('QTY', 'Quantity')))
    quantity = models.PositiveIntegerField(blank=True, null=True)
    last_modified = models.DateTimeField(auto_now=True, editable=False)

    def get_location_uid(self):
        return self.parent.parent.uid

    def clean(self):
        if not self.uid:
            self.uid = uuid.uuid4().hex
        if self.status == 'QTY':
            if self.quantity == 0:
                self.status = 'OUT'
            elif not self.quantity:
                # Ideally this error would be associated with the quantity field
                # but right now it's associated with the model as a whole
                raise ValidationError('You must enter a quantity.')

    def __unicode__(self):
        return self.name

    class Meta:
        ordering = ('name',)
        permissions = (('set_item_status', 'Can change item status'),)


class Closure(models.Model):
    location = models.ForeignKey(Location)

    class Meta:
        abstract = True


class WeeklyClosure(Closure):
    weekday = models.PositiveIntegerField(choices=(
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday')))

    def __unicode__(self):
        return self.get_weekday_display()

    class Meta:
        ordering = ('weekday',)


class OneTimeClosure(Closure):
    start_date = models.DateField()
    end_date = models.DateField()

    def clean(self):
        if self.end_date < self.start_date:
            raise ValidationError('End date cannot be earlier than start date.')

    def __unicode__(self):
        return u'{} to {}'.format(self.start_date, self.end_date)

    class Meta:
        ordering = ('start_date', 'end_date')
