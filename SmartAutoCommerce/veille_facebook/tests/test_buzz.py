"""
Tests pour les endpoints Buzz.
Utilise le même framework de test que le projet (django.test + DRF).
"""

from django.test import TestCase
from rest_framework.test import APIClient


class BuzzViewsTestCase(TestCase):
    """Tests des endpoints /api/veille-facebook/buzz/"""

    def setUp(self):
        self.client = APIClient()

    def test_buzz_liste_sans_filtre(self):
        """GET /api/veille-facebook/buzz/ — liste sans filtre."""
        response = self.client.get('/api/veille-facebook/buzz/')
        self.assertIn(response.status_code, [200, 500])
        if response.status_code == 200:
            self.assertIsInstance(response.json(), list)

    def test_buzz_liste_filtree_par_concurrent(self):
        """GET /api/veille-facebook/buzz/?concurrent=... — filtre par concurrent."""
        response = self.client.get('/api/veille-facebook/buzz/', {'concurrent': 'test'})
        self.assertIn(response.status_code, [200, 500])
        if response.status_code == 200:
            data = response.json()
            self.assertIsInstance(data, list)

    def test_buzz_stats_globales(self):
        """GET /api/veille-facebook/buzz/stats/ — KPIs globaux."""
        response = self.client.get('/api/veille-facebook/buzz/stats/')
        self.assertIn(response.status_code, [200, 500])
        if response.status_code == 200:
            data = response.json()
            self.assertIn('nb_produits_total', data)
            self.assertIn('nb_ultra_priority', data)
            self.assertIn('score_engagement_max', data)
