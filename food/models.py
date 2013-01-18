import uuid
from django.db import models
from django.core.validators import validate_slug
from django.core.exceptions import ValidationError

class Location(models.Model):
    uid = models.CharField(
        'ID',
        max_length=24,
        primary_key=True,
        validators=[validate_slug],
        help_text='The unique ID of this location, which will determine the \
        location\'s URL. For instance, entering "foo" would yield something \
        like "example.com/location/foo/".')
    name = models.CharField(max_length=32)
    open = models.BooleanField()
    last_modified = models.DateTimeField(auto_now=True, editable=False)

    def get_location_uid(self):
        return self.uid

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
    contains_hot_food = models.BooleanField()
    last_modified = models.DateTimeField(auto_now=True, editable=False)

    def get_location_uid(self):
        return self.parent.uid

    def is_available(self):
        return self.item_set.exclude(status='OUT').count() > 0

    def clean(self):
        if not self.uid:
            self.uid = uuid.uuid4().hex

    def __unicode__(self):
        return self.name

    class Meta:
        ordering = ('contains_hot_food', 'name')
        verbose_name_plural = 'categories'


class Item(models.Model):
    uid = models.CharField('UUID', max_length=32,
                           editable=False, primary_key=True)
    parent = models.ForeignKey(Category)
    name = models.CharField(max_length=32)
    status = models.CharField(blank=True, max_length=3, choices=(
        ('AVA', 'Available'),
        ('LOW', 'Running Low'),
        ('OUT', 'Sold Out'),
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
