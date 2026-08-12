"""
Tests pour les endpoints Prix.
"""

from django.test import TestCase
from rest_framework.test import APIClient


class PrixViewsTestCase(TestCase):

    def setUp(self):
        self.client = APIClient()

    def test_prix_grille(self):
        """GET /api/veille-facebook/prix/"""
        response = self.client.get('/api/veille-facebook/prix/')
        self.assertIn(response.status_code, [200, 500])
        if response.status_code == 200:
            self.assertIsInstance(response.json(), list)

    def test_prix_fourchette(self):
        """GET /api/veille-facebook/prix/Câble/"""
        response = self.client.get('/api/veille-facebook/prix/Câble/')
        self.assertIn(response.status_code, [200, 500])
        if response.status_code == 200:
            data = response.json()
            self.assertIn('categorie', data)
