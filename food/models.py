import uuid
from os import path
from django.db import models
from django.core.validators import validate_slug
from django.core.exceptions import ValidationError

class Location(models.Model):
    name = models.CharField(max_length=32)
    open = models.BooleanField()
    last_modified = models.DateTimeField(auto_now=True, editable=False)
    uid = models.CharField(
        'ID',
        max_length=24,
        primary_key=True,
        validators=[validate_slug],
        help_text='The unique ID of this location, which will determine the \
        location\'s URL. For instance, entering "foo" would yield something \
        like "example.com/location/foo/".')

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
    parent = models.ForeignKey(Location)
    name = models.CharField(max_length=32)
    last_modified = models.DateTimeField(auto_now=True, editable=False)
    uid = models.CharField('UUID', max_length=32,
                           editable=False, primary_key=True)

    def get_location_uid(self):
        return self.parent.uid

    def clean(self):
        if not self.uid:
            self.uid = uuid.uuid4().hex

    def __unicode__(self):
        return self.name

    class Meta:
        ordering = ('name',)
        verbose_name_plural = 'categories'


class Item(models.Model):
    parent = models.ForeignKey(Category)
    name = models.CharField(max_length=32)
    price = models.DecimalField(blank=True, null=True, max_digits=8, decimal_places=2)
    quantity = models.PositiveIntegerField(blank=True, null=True)
    status = models.CharField(blank=True, max_length=3, choices=(
        ('AVA', 'Available'),
        ('LOW', 'Running Low'),
        ('OUT', 'Sold Out'),
        ('QTY', 'Quantity')))
    last_modified = models.DateTimeField(auto_now=True, editable=False)
    uid = models.CharField('UUID', max_length=32,
                           editable=False, primary_key=True)

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
