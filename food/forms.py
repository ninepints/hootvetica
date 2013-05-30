from django.forms import ModelForm, HiddenInput
from food.models import Location, Category, Item

class LocationForm(ModelForm):
	class Meta:
		model = Location
		fields = ('open',)

class CategoryCreationForm(ModelForm):
    class Meta:
        model = Category
        widgets = {'parent': HiddenInput}

class CategoryForm(ModelForm):
    class Meta:
        model = Category
        exclude = ('parent',)

class ItemCreationForm(ModelForm):
    class Meta:
        model = Item
        widgets = {'parent': HiddenInput}

class ItemForm(ModelForm):
    class Meta:
        model = Item
        exclude = ('parent',)

class ItemStatusForm(ModelForm):
    class Meta:
        model = Item
        fields = ('status', 'quantity')
