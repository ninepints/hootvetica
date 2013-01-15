from django.forms import ModelForm, HiddenInput
from hoot.food.models import Location, Category, Item

class LocationForm(ModelForm):
	class Meta:
		model = Location
		fields = ('open',)

class CategoryForm(ModelForm):
    class Meta:
        model = Category
        widgets = {'parent': HiddenInput}

class ItemForm(ModelForm):
    class Meta:
        model = Item
        widgets = {'parent': HiddenInput}
