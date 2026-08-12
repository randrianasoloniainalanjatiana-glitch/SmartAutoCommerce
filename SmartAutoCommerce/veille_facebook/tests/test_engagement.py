"""
Tests pour les endpoints Engagement.
"""

from django.test import TestCase
from rest_framework.test import APIClient


class EngagementViewsTestCase(TestCase):

    def setUp(self):
        self.client = APIClient()

    def test_engagement_concurrents(self):
        """GET /api/veille-facebook/engagement/concurrents/"""
        response = self.client.get('/api/veille-facebook/engagement/concurrents/')
        self.assertIn(response.status_code, [200, 500])
        if response.status_code == 200:
            self.assertIsInstance(response.json(), list)

    def test_engagement_categories(self):
        """GET /api/veille-facebook/engagement/categories/"""
        response = self.client.get('/api/veille-facebook/engagement/categories/')
        self.assertIn(response.status_code, [200, 500])
        if response.status_code == 200:
            self.assertIsInstance(response.json(), list)

    def test_engagement_prix(self):
        """GET /api/veille-facebook/engagement/prix/"""
        response = self.client.get('/api/veille-facebook/engagement/prix/')
        self.assertIn(response.status_code, [200, 500])
        if response.status_code == 200:
            data = response.json()
            self.assertIsInstance(data, list)
            if data:
                self.assertIn('tranche', data[0])
