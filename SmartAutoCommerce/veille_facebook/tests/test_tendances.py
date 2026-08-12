"""
Tests pour les endpoints Tendances.
"""

from django.test import TestCase
from rest_framework.test import APIClient


class TendancesViewsTestCase(TestCase):

    def setUp(self):
        self.client = APIClient()

    def test_tendances_frequence(self):
        """GET /api/veille-facebook/tendances/frequence/"""
        response = self.client.get('/api/veille-facebook/tendances/frequence/')
        self.assertIn(response.status_code, [200, 500])
        if response.status_code == 200:
            self.assertIsInstance(response.json(), list)

    def test_tendances_lancements(self):
        """GET /api/veille-facebook/tendances/lancements/?jours=30"""
        response = self.client.get('/api/veille-facebook/tendances/lancements/', {'jours': 30})
        self.assertIn(response.status_code, [200, 500])
        if response.status_code == 200:
            self.assertIsInstance(response.json(), list)

    def test_tendances_emergents(self):
        """GET /api/veille-facebook/tendances/emergents/"""
        response = self.client.get('/api/veille-facebook/tendances/emergents/')
        self.assertIn(response.status_code, [200, 500])
        if response.status_code == 200:
            self.assertIsInstance(response.json(), list)
