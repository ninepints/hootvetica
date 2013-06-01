from django.views.generic import DetailView, CreateView, UpdateView, DeleteView
from django.http import HttpResponse, HttpResponseRedirect, HttpResponseNotAllowed
from django.core.urlresolvers import reverse
from django.core.exceptions import PermissionDenied
from django.contrib.auth.views import redirect_to_login
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.cache import cache_control
from food.models import Location, Category, Item
from food.forms import (LocationForm, CategoryCreationForm, CategoryForm,
                        ItemCreationForm, ItemForm, ItemStatusForm)

# View mixins

class LocationMixin(object):
    model = Location
    form_class = LocationForm
    state_template_name = 'food/location_data.json'
    context_object_name = 'location'

class CategoryMixin(object):
    model = Category
    form_class = CategoryForm
    state_template_name = 'food/category_data.json'
    context_object_name = 'category'

class ItemMixin(object):
    model = Item
    form_class = ItemForm
    state_template_name = 'food/item_data.json'
    context_object_name = 'item'


class FoodModelMixin(object):
    def get_context_data(self, **kwargs):
        context = super(FoodModelMixin, self).get_context_data(**kwargs)
        context['model'] = self.object.__class__.__name__
        return context

    def get_success_url(self):
        return reverse('location', args=[self.object.get_location_uid()])


class AjaxMixin(object):
    def render_to_response(self, context, templates=None, **response_kwargs):
        if templates is None:
            templates = self.get_template_names()
        return self.response_class(
            request = self.request,
            template = templates,
            context = context,
            mimetype = 'application/json',
            **response_kwargs)


class AjaxFormMixin(AjaxMixin):
    template_name = 'food/update_reject.json'

    def get(self, request, *args, **kwargs):
        return HttpResponseNotAllowed(['POST', 'PUT'])

    def form_valid(self, form):
        self.object = form.save()
        return self.render_to_response(
            self.get_context_data(state_template_name=self.state_template_name),
            templates=['food/update_accept.json'])


class PermissionRequiredMixin(object):
    required_permissions = ()

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

    @method_decorator(ensure_csrf_cookie)
    def dispatch(self, *args, **kwargs):
        return super(LocationView, self).dispatch(*args, **kwargs)

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
        context['include_children'] = True
        return context


class LocationAjaxView(LocationMixin, AjaxMixin, DetailView):
    template_name = 'food/location_data.json'

    @method_decorator(cache_control(no_cache=True))
    def dispatch(self, *args, **kwargs):
        return super(LocationAjaxView, self).dispatch(*args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super(LocationAjaxView, self).get_context_data(**kwargs)
        context['include_children'] = True
        return context


# Base editing views

class FoodCreateView(FoodModelMixin, CreateView):
    template_name = 'food/edit.html'

    def get_context_data(self, **kwargs):
        context = super(FoodCreateView, self).get_context_data(**kwargs)
        context['action'] = 'add'
        # Self.object is None before the creation form is processed, so we have
        # to get the model class from the form
        context['model'] = self.get_form_class()._meta.model.__name__
        return context


class AjaxCreateView(AjaxFormMixin, CreateView):
    pass


class FoodUpdateView(FoodModelMixin, UpdateView):
    template_name = 'food/edit.html'

    def get_context_data(self, **kwargs):
        context = super(FoodUpdateView, self).get_context_data(**kwargs)
        context['action'] = 'edit'
        return context


class AjaxUpdateView(AjaxFormMixin, UpdateView):
    pass


class FoodDeleteView(FoodModelMixin, DeleteView):
    template_name = 'food/delete.html'

    def get_context_data(self, **kwargs):
        context = super(FoodDeleteView, self).get_context_data(**kwargs)
        context['name'] = kwargs['object'].name
        return context


class AjaxDeleteView(DeleteView):
    def get(self, request, *args, **kwargs):
        return HttpResponseNotAllowed(['POST', 'DELETE'])

    def delete(self, request, *args, **kwargs):
        self.object = self.get_object()
        self.object.delete()
        return HttpResponse('{"accepted": true}',
                            mimetype='application/json')


# Editing views

class CategoryCreateView(PermissionRequiredMixin,
                         CategoryMixin, FoodCreateView):
    form_class = CategoryCreationForm
    required_permissions = ('food.add_category',)

    def get_initial(self):
        initial = super(CategoryCreateView, self).get_initial()
        try:
            initial['parent'] = Location.objects.get(
                uid=self.request.GET['parent'])
        except (KeyError, Location.DoesNotExist):
            pass
        return initial


class CategoryAjaxCreateView(PermissionRequiredMixin,
                             CategoryMixin, AjaxCreateView):
    form_class = CategoryCreationForm
    required_permissions = ('food.add_category',)


class ItemCreateView(PermissionRequiredMixin, ItemMixin, FoodCreateView):
    form_class = ItemCreationForm
    required_permissions = ('food.add_item',)

    def get_initial(self):
        initial = super(ItemCreateView, self).get_initial()
        try:
            initial['parent'] = Category.objects.get(
                uid=self.request.GET['parent'])
        except (KeyError, Category.DoesNotExist):
            pass
        return initial


class ItemAjaxCreateView(PermissionRequiredMixin, ItemMixin, AjaxCreateView):
    form_class = ItemCreationForm
    required_permissions = ('food.add_item',)


class LocationUpdateView(PermissionRequiredMixin,
                         LocationMixin, FoodUpdateView):
    required_permissions = ('food.change_location', 'food.set_location_status')


class LocationAjaxUpdateView(PermissionRequiredMixin,
                             LocationMixin, AjaxUpdateView):
    required_permissions = ('food.change_location', 'food.set_location_status')


class CategoryUpdateView(PermissionRequiredMixin,
                         CategoryMixin, FoodUpdateView):
    required_permissions = ('food.change_category',)


class CategoryAjaxUpdateView(PermissionRequiredMixin,
                             CategoryMixin, AjaxUpdateView):
    required_permissions = ('food.change_category',)


class ItemUpdateView(PermissionRequiredMixin, ItemMixin, FoodUpdateView):
    required_permissions = ('food.change_item',)


class ItemAjaxUpdateView(PermissionRequiredMixin, ItemMixin, AjaxUpdateView):
    required_permissions = ('food.change_item',)


class ItemStatusUpdateView(ItemMixin, FoodUpdateView):
    form_class = ItemStatusForm


class ItemStatusAjaxUpdateView(ItemMixin, AjaxUpdateView):
    form_class = ItemStatusForm


class CategoryDeleteView(PermissionRequiredMixin,
                         CategoryMixin, FoodDeleteView):
    required_permissions = ('food.delete_category',)


class CategoryAjaxDeleteView(PermissionRequiredMixin,
                             CategoryMixin, AjaxDeleteView):
    required_permissions = ('food.delete_category',)


class ItemDeleteView(PermissionRequiredMixin, ItemMixin, FoodDeleteView):
    required_permissions = ('food.delete_item',)


class ItemAjaxDeleteView(PermissionRequiredMixin, ItemMixin, AjaxDeleteView):
    required_permissions = ('food.delete_item',)
