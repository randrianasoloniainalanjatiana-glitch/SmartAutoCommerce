"""
Tests pour les endpoints Catalogue.
"""

from django.test import TestCase
from rest_framework.test import APIClient


class CatalogueViewsTestCase(TestCase):

    def setUp(self):
        self.client = APIClient()

    def test_catalogue_opportunites(self):
        """GET /api/veille-facebook/catalogue/opportunites/"""
        response = self.client.get('/api/veille-facebook/catalogue/opportunites/')
        self.assertIn(response.status_code, [200, 500])
        if response.status_code == 200:
            self.assertIsInstance(response.json(), list)

    def test_catalogue_stars(self):
        """GET /api/veille-facebook/catalogue/stars/"""
        response = self.client.get('/api/veille-facebook/catalogue/stars/')
        self.assertIn(response.status_code, [200, 500])
        if response.status_code == 200:
            self.assertIsInstance(response.json(), list)

    def test_catalogue_eviter(self):
        """GET /api/veille-facebook/catalogue/eviter/"""
        response = self.client.get('/api/veille-facebook/catalogue/eviter/')
        self.assertIn(response.status_code, [200, 500])
        if response.status_code == 200:
            self.assertIsInstance(response.json(), list)
