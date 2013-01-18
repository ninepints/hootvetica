from django.views.generic import DetailView, CreateView, UpdateView, DeleteView
from django.http import HttpResponse, HttpResponseRedirect, HttpResponseNotAllowed
from django.core.urlresolvers import reverse
from django.core.exceptions import PermissionDenied
from django.contrib.auth.views import redirect_to_login
from food.models import Location, Category, Item
from food.forms import LocationForm, CategoryForm, ItemForm

# View mixins

class LocationMixin(object):
    model = Location
    form_class = LocationForm

class CategoryMixin(object):
    model = Category
    form_class = CategoryForm

class ItemMixin(object):
    model = Item
    form_class = ItemForm


class FoodModelMixin(object):
    def get_context_data(self, **kwargs):
        context = super(FoodModelMixin, self).get_context_data(**kwargs)
        context['model'] = self.object.__class__.__name__
        return context

    def get_success_url(self):
        return reverse('location', args=[self.object.get_location_uid()])


class AjaxMixin(object):
    def render_to_response(self, context, **response_kwargs):
        return self.response_class(
            request = self.request,
            template = self.get_template_names(),
            context = context,
            mimetype = 'application/json',
            **response_kwargs)


class AjaxFormMixin(AjaxMixin):
    template_name = 'food/update_reject.json'

    def get(self, request, *args, **kwargs):
        return HttpResponseNotAllowed(['POST', 'PUT'])

    def form_valid(self, form):
        self.object = form.save()
        return HttpResponse('{"accepted": true}',
                            mimetype='application/json')


class PermissionRequiredMixin(object):
    def __init__(self):
        self.required_permissions = ()

    def dispatch(self, request, *args, **kwargs):
        user = request.user
        if not user.is_authenticated():
            # Blindly assuming it's OK to use a relative URL here
            return redirect_to_login(request.path)
        if self.required_permissions and not any(user.has_perm(perm) for perm
                                                 in self.required_permissions):
            raise PermissionDenied
        return super(PermissionRequiredMixin, self).dispatch(request=request,
                                                             *args, **kwargs)


# Detail views

class LocationView(LocationMixin, DetailView):
    template_name = 'food/location_detail.html'

    def get_context_data(self, **kwargs):
        context = super(LocationView, self).get_context_data(**kwargs)
        try:
            refresh_interval = int(self.request.GET['refresh_interval'])
            if refresh_interval >= 5:
                context['refresh_interval'] = refresh_interval
        except (KeyError, ValueError):
            pass
        try:
            refresh_interval_err = int(self.request.GET['refresh_interval_err'])
            if refresh_interval_err >= 5:
                context['refresh_interval_err'] = refresh_interval_err
        except (KeyError, ValueError):
            pass
        return context


class LocationAjaxView(LocationMixin, AjaxMixin, DetailView):
    template_name = 'food/location_data.json'


# Base editing views

class FoodCreateView(PermissionRequiredMixin, FoodModelMixin, CreateView):
    template_name = 'food/edit.html'

    def get_context_data(self, **kwargs):
        context = super(FoodCreateView, self).get_context_data(**kwargs)
        context['action'] = 'add'
        # Self.object is None before the creation form is processed, so we have
        # to get the model class from the form
        context['model'] = self.get_form_class()._meta.model.__name__
        return context


class AjaxCreateView(PermissionRequiredMixin, AjaxFormMixin, CreateView):
    pass


class FoodUpdateView(PermissionRequiredMixin, FoodModelMixin, UpdateView):
    template_name = 'food/edit.html'

    def get_context_data(self, **kwargs):
        context = super(FoodUpdateView, self).get_context_data(**kwargs)
        context['action'] = 'edit'
        return context


class AjaxUpdateView(PermissionRequiredMixin, AjaxFormMixin, UpdateView):
    pass


class FoodDeleteView(PermissionRequiredMixin, FoodModelMixin, DeleteView):
    template_name = 'food/delete.html'

    def get_context_data(self, **kwargs):
        context = super(FoodDeleteView, self).get_context_data(**kwargs)
        context['name'] = kwargs['object'].name
        return context


class AjaxDeleteView(PermissionRequiredMixin, DeleteView):
    def get(self, request, *args, **kwargs):
        return HttpResponseNotAllowed(['POST', 'DELETE'])

    def delete(self, request, *args, **kwargs):
        self.object = self.get_object()
        self.object.delete()
        return HttpResponse('{"accepted": true}',
                            mimetype='application/json')


# Editing views

class CategoryCreateView(CategoryMixin, FoodCreateView):
    required_permissions = ('food.add_category',)

    def get_initial(self):
        initial = super(CategoryCreateView, self).get_initial()
        try:
            initial['parent'] = Location.objects.get(
                uid=self.request.GET['parent'])
        except (KeyError, Location.DoesNotExist):
            pass
        return initial


class CategoryAjaxCreateView(CategoryMixin, AjaxCreateView):
    required_permissions = ('food.add_category',)

class ItemCreateView(ItemMixin, FoodCreateView):
    required_permissions = ('food.add_item',)

    def get_initial(self):
        initial = super(ItemCreateView, self).get_initial()
        try:
            initial['parent'] = Category.objects.get(
                uid=self.request.GET['parent'])
        except (KeyError, Category.DoesNotExist):
            pass
        return initial


class ItemAjaxCreateView(ItemMixin, AjaxCreateView):
    required_permissions = ('food.add_item',)

class LocationUpdateView(LocationMixin, FoodUpdateView):
    required_permissions = ('food.change_location', 'food.set_location_status')

class LocationAjaxUpdateView(LocationMixin, AjaxUpdateView):
    required_permissions = ('food.change_location', 'food.set_location_status')

class CategoryUpdateView(CategoryMixin, FoodUpdateView):
    required_permissions = ('food.change_category',)

class CategoryAjaxUpdateView(CategoryMixin, AjaxUpdateView):
    required_permissions = ('food.change_category',)

class ItemUpdateView(ItemMixin, FoodUpdateView):
    required_permissions = ('food.change_item',)

class ItemAjaxUpdateView(ItemMixin, AjaxUpdateView):
    required_permissions = ('food.change_item',)

class CategoryDeleteView(CategoryMixin, FoodDeleteView):
    required_permissions = ('food.delete_category',)

class CategoryAjaxDeleteView(CategoryMixin, AjaxDeleteView):
    required_permissions = ('food.delete_category',)

class ItemDeleteView(ItemMixin, FoodDeleteView):
    required_permissions = ('food.delete_item',)

class ItemAjaxDeleteView(ItemMixin, AjaxDeleteView):
    required_permissions = ('food.delete_item',)
