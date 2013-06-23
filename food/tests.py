import re, uuid
from datetime import timedelta
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User, Permission
from django.contrib.contenttypes.models import ContentType
from django.conf import settings
from food.models import Location, Category, Item


class ModelTest(TestCase):
    def setUp(self):
        '''
        Sets up the following locations:
        loc0 - no categories
        loc1 - single empty 'cold' category
        loc2 - single nonempty 'cold' category
        loc3 - single empty 'hot' category
        loc4 - single nonempty 'hot' category
        loc5 - one 'hot' and one 'cold' category, former of which is empty
        loc6 - one 'hot' and one 'cold' category, former of which is nonempty
        '''
        self.loc0 = Location.objects.create(uid='loc0', name='loc0', open=True)
        self.loc1 = Location.objects.create(uid='loc1', name='loc1', open=True)
        self.loc2 = Location.objects.create(uid='loc2', name='loc2', open=True)
        self.loc3 = Location.objects.create(uid='loc3', name='loc3', open=True)
        self.loc4 = Location.objects.create(uid='loc4', name='loc4', open=True)
        self.loc5 = Location.objects.create(uid='loc5', name='loc5', open=True)
        self.loc6 = Location.objects.create(uid='loc6', name='loc6', open=True)

        self.cat1_0 = Category.objects.create(
            uid=uuid.uuid4().hex, parent=self.loc1,
            name='cat1_0', contents_hot=False)
        self.cat2_0 = Category.objects.create(
            uid=uuid.uuid4().hex, parent=self.loc2,
            name='cat2_0', contents_hot=False)
        self.cat3_0 = Category.objects.create(
            uid=uuid.uuid4().hex, parent=self.loc3,
            name='cat3_0', contents_hot=True)
        self.cat4_0 = Category.objects.create(
            uid=uuid.uuid4().hex, parent=self.loc4,
            name='cat4_0', contents_hot=True)
        self.cat5_0 = Category.objects.create(
            uid=uuid.uuid4().hex, parent=self.loc5,
            name='cat5_0', contents_hot=False)
        self.cat5_1 = Category.objects.create(
            uid=uuid.uuid4().hex, parent=self.loc5,
            name='cat5_1', contents_hot=True)
        self.cat6_0 = Category.objects.create(
            uid=uuid.uuid4().hex, parent=self.loc6,
            name='cat6_0', contents_hot=False)
        self.cat6_1 = Category.objects.create(
            uid=uuid.uuid4().hex, parent=self.loc6,
            name='cat6_1', contents_hot=True)

        self.item2_0_0 = Item.objects.create(
            uid=uuid.uuid4().hex, parent=self.cat2_0,
            name='item2_0_0', status='AVA')
        self.item4_0_0 = Item.objects.create(
            uid=uuid.uuid4().hex, parent=self.cat4_0,
            name='item4_0_0', status='AVA')
        self.item5_0_0 = Item.objects.create(
            uid=uuid.uuid4().hex, parent=self.cat5_0,
            name='item5_0_0', status='AVA')
        self.item6_0_0 = Item.objects.create(
            uid=uuid.uuid4().hex, parent=self.cat6_0,
            name='item6_0_0', status='AVA')
        self.item6_1_0 = Item.objects.create(
            uid=uuid.uuid4().hex, parent=self.cat6_1,
            name='item6_1_0', status='AVA')
        self.item6_1_1 = Item.objects.create(
            uid=uuid.uuid4().hex, parent=self.cat6_1,
            name='item6_1_1', status='AVA')

    def test_parent_uid(self):
        self.assertEqual(self.loc0.get_location_uid(), 'loc0')

        for model in (self.loc1, self.cat1_0):
            uid = model.get_location_uid()
            self.assertEqual(uid, 'loc1',
                '{} returned location id {} (expected loc1)'.format(model, uid))

        for model in (self.loc2, self.cat2_0, self.item2_0_0):
            uid = model.get_location_uid()
            self.assertEqual(uid, 'loc2',
                '{} returned location id {} (expected loc2)'.format(model, uid))

        for model in (self.loc3, self.cat3_0):
            uid = model.get_location_uid()
            self.assertEqual(uid, 'loc3',
                '{} returned location id {} (expected loc3)'.format(model, uid))

        for model in (self.loc4, self.cat4_0, self.item4_0_0):
            uid = model.get_location_uid()
            self.assertEqual(uid, 'loc4',
                '{} returned location id {} (expected loc4)'.format(model, uid))

        for model in (self.loc5, self.cat5_0, self.cat5_1, self.item5_0_0):
            uid = model.get_location_uid()
            self.assertEqual(uid, 'loc5',
                '{} returned location id {} (expected loc5)'.format(model, uid))

        for model in (self.loc6, self.cat6_0, self.cat6_1,
                      self.item6_0_0, self.item6_1_0, self.item6_1_1):
            uid = model.get_location_uid()
            self.assertEqual(uid, 'loc6',
                '{} returned location id {} (expected loc6)'.format(model, uid))

    def test_availability(self):
        self.assertFalse(self.loc0.hot_food_available())
        self.assertFalse(self.loc1.hot_food_available())
        self.assertFalse(self.loc2.hot_food_available())
        self.assertFalse(self.loc3.hot_food_available())
        self.assertTrue(self.loc4.hot_food_available())

        self.assertFalse(self.loc5.hot_food_available())
        self.assertFalse(self.cat5_1.food_available())

        self.assertTrue(self.loc6.hot_food_available())
        self.assertTrue(self.cat6_1.food_available())

        self.item6_1_0.status = 'OUT'
        self.item6_1_0.save()
        self.item6_1_1.status = 'OUT'
        self.item6_1_1.save()
        self.assertFalse(self.loc6.hot_food_available())
        self.assertFalse(self.cat6_1.food_available())

        self.item6_1_1.status = 'LOW'
        self.item6_1_1.save()
        self.assertTrue(self.loc6.hot_food_available())
        self.assertTrue(self.cat6_1.food_available())

        self.item6_1_1.status = 'QTY'
        self.item6_1_1.quantity = 2
        self.item6_1_1.save()
        self.assertTrue(self.loc6.hot_food_available())
        self.assertTrue(self.cat6_1.food_available())

    def test_tree_last_modified(self):
        t = max(self.loc6.last_modified, self.cat6_0.last_modified,
                self.cat6_1.last_modified, self.item6_0_0.last_modified,
                self.item6_1_0.last_modified, self.item6_1_1.last_modified)
        self.assertEqual(self.loc6.get_tree_last_modified(), t)

        t += timedelta(minutes=20)
        Item.objects.filter(name='item6_0_0').update(last_modified=t)
        self.assertEqual(self.loc6.get_tree_last_modified(), t)

        t += timedelta(seconds=35)
        Item.objects.filter(name='item6_1_1').update(last_modified=t)
        self.assertEqual(self.loc6.get_tree_last_modified(), t)

        t += timedelta(hours=2)
        Category.objects.filter(name='cat6_0').update(last_modified=t)
        self.assertEqual(self.loc6.get_tree_last_modified(), t)

        t += timedelta(days=1)
        Location.objects.filter(name='loc6').update(last_modified=t)
        self.loc6 = Location.objects.get(uid='loc6') # Reload the model
        self.assertEqual(self.loc6.get_tree_last_modified(), t)


class ItemValidationTest(TestCase):
    def runTest(self):
        item = Item(name='item', status='QTY')
        self.assertRaises(ValidationError, item.full_clean, exclude=('parent',))

        item = Item(name='item', status='QTY', quantity=0)
        item.full_clean(exclude=('parent',))
        self.assertEqual(item.status, 'OUT')

        item = Item(name='item', status='QTY', quantity=1)
        item.full_clean(exclude=('parent',))
        self.assertEqual(item.status, 'QTY')
        self.assertEqual(item.quantity, 1)


class UidGenerationTest(TestCase):
    def runTest(self):
        uid_regex = re.compile(r'^[a-fA-F0-9]{32}$')

        category = Category(name='cat')
        category.full_clean(exclude=('parent',))
        self.assertIsNotNone(uid_regex.match(category.uid))

        item = Item(name='item', status='AVA')
        item.full_clean(exclude=('parent',))
        self.assertIsNotNone(uid_regex.match(item.uid))


class ViewTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            'testuser', 'testuser@hootveti.ca', 'testpassword')
        self.user.is_superuser = True
        self.user.save()

        self.location = Location.objects.create(
            uid='testloc', name='test location', open=True)
        category = Category.objects.create(
            uid='testcat', parent=self.location,
            name='test category', contents_hot=False)
        Item.objects.create(
            uid='testitem', parent=category,
            name='test item', status='AVA')

        self.create_urls = ['/category/add/', '/item/add/']
        self.update_urls = ['/location/testloc/edit/',
                            '/category/testcat/edit/',
                            '/item/testitem/edit/',
                            '/item/testitem/edit-status/']
        self.delete_urls = ['/category/testcat/delete/',
                            '/item/testitem/delete/']

        self.ajax_create_urls = map(lambda x: '/ajax' + x, self.create_urls)
        self.ajax_update_urls = map(lambda x: '/ajax' + x, self.update_urls)
        self.ajax_delete_urls = map(lambda x: '/ajax' + x, self.delete_urls)

        self.create_data = [
            {'parent': 'testloc', 'uid': 'testcat',
             'name': 'test category', 'contents_hot': False},
            {'parent': 'testcat', 'uid': 'testitem',
             'name': 'test item', 'status': 'AVA'}
        ]
        self.update_data = [
            {'open': True}, {'name': 'test category'},
            {'name': 'test item', 'status': 'AVA'}, {'status': 'AVA'}
        ]
        self.delete_data = [{}, {}]

        # Setup actions to execute before testing various views
        self.create_setup_actions = [self.delete_category, self.delete_item]
        self.update_setup_actions = [lambda: None, self.setup_category,
                                     self.setup_item, self.setup_item]
        self.delete_setup_actions = [self.setup_category, self.setup_item]

    def setup_category(self):
        self.delete_category()
        Category.objects.create(
            uid='testcat', parent=self.location,
            name='test category', contents_hot=False)

    def delete_category(self):
        Category.objects.all().delete()

    def setup_item(self):
        self.delete_item()
        Item.objects.create(
            uid='testitem', parent=Category.objects.get(pk='testcat'),
            name='test item', status='AVA')

    def delete_item(self):
        self.setup_category()
        Item.objects.all().delete()

    def login(self):
        self.client.login(username='testuser', password='testpassword')

    def get_permission(self, perm_name):
        if 'location' in perm_name:
            model = Location
        elif 'category' in perm_name:
            model = Category
        elif 'item' in perm_name:
            model = Item
        else:
            raise ValueError('invalid permission {}'.format(perm_name))

        content_type = ContentType.objects.get_for_model(model)
        return Permission.objects.get(
            content_type=content_type, codename=perm_name)

    def add_permission(self, perm_name):
        self.user.user_permissions.add(self.get_permission(perm_name))
        self.user.save()

    def remove_permission(self, perm_name):
        self.user.user_permissions.remove(self.get_permission(perm_name))
        self.user.save()

    def test_allowed_methods(self):
        http_methods = set(('get', 'post', 'put', 'delete', 'head', 'options'))
        edit_methods = set(('get', 'post', 'put', 'head', 'options'))
        delete_methods = set(('get', 'post', 'delete', 'head', 'options'))
        ajax_edit_methods = set(('post', 'put', 'options'))
        ajax_delete_methods = set(('post', 'delete', 'options'))

        self.login()
        for urls, datasets, methods, actions in (
                (self.create_urls, self.create_data,
                    edit_methods, self.create_setup_actions),
                (self.update_urls, self.update_data,
                    edit_methods, self.update_setup_actions),
                (self.delete_urls, self.delete_data,
                    delete_methods, self.delete_setup_actions),
                (self.ajax_create_urls, self.create_data,
                    ajax_edit_methods, self.create_setup_actions),
                (self.ajax_update_urls, self.update_data,
                    ajax_edit_methods, self.update_setup_actions),
                (self.ajax_delete_urls, self.delete_data,
                    ajax_delete_methods, self.delete_setup_actions)):
            for url, data, action in zip(urls, datasets, actions):

                for method in methods:
                    # Verify that the request is successful (insofar as it
                    # doesn't result in a 405)

                    action()
                    response = getattr(self.client, method)(url, data)

                    self.assertNotEqual(
                        response.status_code, 405,
                        '{} request to {} resulted in response code 405'.format(
                            method, url))

                for method in http_methods - methods:
                    # Verify that the request results in a 405 (unless it's an
                    # OPTIONS request) and that the response includes a correct
                    # 'Allow' header

                    response = getattr(self.client, method)(url)
                    expected = 200 if method == 'options' else 405

                    self.assertEqual(
                        response.status_code, expected,
                        ('{} request to {} resulted in response code {} '
                            '(expected {})').format(
                            method.upper(), url,
                            response.status_code, expected))

                    self.assertEqual(
                        set(map(lambda x: x.strip().lower(),
                            response['Allow'].split(','))),
                        methods,
                        ('{} request to {} resulted in "Allow" header {} '
                            '(expected {})').format(
                            method.upper(), url, response['Allow'],
                            ', '.join(methods).upper()))

    def test_location_views(self):
        response = self.client.get('/location/testloc/')
        self.assertTemplateUsed(response, 'food/location_detail.html')

        response = self.client.get('/ajax/location/testloc/')
        self.assertTemplateUsed(response, 'food/location_data.json')
        self.assertTemplateUsed(response, 'food/category_data.json')
        self.assertTemplateUsed(response, 'food/item_data.json')

    def test_permission_checks(self):
        self.user.is_superuser = False
        self.user.save()

        authonly_urls = (self.create_urls +
                         self.update_urls[:-1] +
                         self.delete_urls)
        authonly_ajax_urls = (self.ajax_create_urls +
                              self.ajax_update_urls[:-1] +
                              self.ajax_delete_urls)

        authonly_data = (self.create_data +
                         self.update_data[:-1] +
                         self.delete_data)

        create_perms = [['add_category'], ['add_item']]
        update_perms = [['change_location', 'set_location_status'],
                        ['change_category'], ['change_item']]
        delete_perms = [['delete_category'], ['delete_item']]
        perms = (create_perms + update_perms + delete_perms)

        authonly_setup_actions = (self.create_setup_actions +
                                  self.update_setup_actions[:-1] +
                                  self.delete_setup_actions)

        for url, data in zip(authonly_urls + authonly_ajax_urls,
                             authonly_data + authonly_data):
            # Verify that requests from unauthenticated users result in a
            # redirect to the login page
            response = self.client.post(url, data, follow=True)
            self.assertRedirects(
                response, settings.LOGIN_URL + '?next=' + url,
                msg_prefix=('request to {} by unauthenticated user didn\'t '
                    'redirect to login').format(url))

        response = self.client.post(
            self.update_urls[-1], self.update_data[-1], follow=True)
        self.assertRedirects(response, '/location/testloc/')

        response = self.client.post(
            self.ajax_update_urls[-1], self.update_data[-1])
        self.assertEqual(response.status_code, 200)

        self.login()

        for url, data, permlist, action in zip(
                authonly_urls, authonly_data, perms, authonly_setup_actions):
            for perm in permlist:
                # Verify that the request is successful when the user has the
                # relevant permision
                self.add_permission(perm)
                action()
                response = self.client.post(url, data, follow=True)
                self.assertRedirects(
                    response, '/location/testloc/',
                    msg_prefix=('request to {} with permission {} didn\'t '
                        'redirect to location detail page').format(url, perm))

                # Verify that the request fails without the permission
                self.remove_permission(perm)
                response = self.client.post(url, data)
                self.assertEqual(
                    response.status_code, 403,
                    ('request to {} without permission {} resulted in '
                        'response code {} (expected 403)').format(
                        url, perm, response.status_code))

        for url, data, permlist, action in zip(
                authonly_ajax_urls, authonly_data,
                perms, authonly_setup_actions):
            for perm in permlist:
                self.add_permission(perm)
                action()
                response = self.client.post(url, data)
                self.assertEqual(
                    response.status_code, 200,
                    ('request to {} with permission {} resulted in response '
                        'code {} (expected 200)').format(
                        url, perm, response.status_code))

                self.remove_permission(perm)
                response = self.client.post(url, data)
                self.assertEqual(
                    response.status_code, 403,
                    ('request to {} without permission {} resulted in '
                        'response code {} (expected 403)').format(
                        url, perm, response.status_code))

    def test_editing_views(self):
        self.login()

        for url, data, action, template in zip(
                self.create_urls + self.update_urls + self.delete_urls,
                self.create_data + self.update_data + self.delete_data,
                self.create_setup_actions + self.update_setup_actions +
                    self.delete_setup_actions,
                ['food/edit.html'] * 6 + ['food/delete.html'] * 2):
            action()

            response = self.client.get(url)
            self.assertTemplateUsed(
                response, template,
                msg_prefix=('GET request to {} didn\'t result in rendering of '
                    'template {}').format(url, template))

            if 'location' in url:
                # Location editing form will accept requests with no data
                response = self.client.post(url, follow=True)
                self.assertRedirects(
                    response, '/location/testloc/',
                    msg_prefix=('POST request to {} with no data didn\'t '
                        'redirect to location detail page').format(url))
            elif 'delete' not in url:
                # Other editing forms should be invalid
                response = self.client.post(url)
                self.assertTemplateUsed(
                    response, template,
                    msg_prefix=('POST request to {} with no data didn\'t '
                        'result in rendering of template {}').format(
                        url, template))
                self.assertFalse(
                    response.context['form'].is_valid(),
                    ('POST request to {} with no data didn\'t result in '
                        'invalid form object').format(url))

            response = self.client.post(url, data, follow=True)
            self.assertRedirects(
                response, '/location/testloc/',
                msg_prefix=('POST request to {} with data didn\'t redirect to '
                    'location detail page').format(url))

        for url, data, action in zip(
                self.ajax_create_urls + self.ajax_update_urls +
                    self.ajax_delete_urls,
                self.create_data + self.update_data + self.delete_data,
                self.create_setup_actions + self.update_setup_actions +
                    self.delete_setup_actions):
            action()

            if 'location' in url:
                response = self.client.post(url)
                self.assertTemplateUsed(
                    response, 'food/update_accept.json',
                    msg_prefix=('POST request to {} with no data didn\'t '
                        'result in rendering of template '
                        'food/update_accept.json').format(url))
            elif 'delete' not in url:
                response = self.client.post(url)
                self.assertTemplateUsed(
                    response, 'food/update_reject.json',
                    msg_prefix=('POST request to {} with no data didn\'t '
                        'result in rendering of template '
                        'food/update_reject.json').format(url))
                self.assertFalse(
                    response.context['form'].is_valid(),
                    ('POST request to {} with no data didn\'t result in '
                        'invalid form object').format(url))

            response = self.client.post(url, data)
            self.assertTemplateUsed(
                response, 'food/update_accept.json',
                msg_prefix=('POST request to {} with data didn\'t result in '
                    'rendering of template '
                    'food/update_accept.json').format(url))
