import re, uuid
from datetime import timedelta
from django.test import TestCase
from django.core.exceptions import ValidationError
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

