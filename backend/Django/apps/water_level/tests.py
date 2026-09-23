"""
Unit tests for Water Level module.
"""

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from .models import WaterLevelReading
from .views import sanitize_incoming_water_level_payload
from apps.authentication.models import User


class WaterLevelReadingModelTest(TestCase):
    """Test cases for WaterLevelReading model."""
    
    def setUp(self):
        self.reading = WaterLevelReading.objects.create(
            water_level_cm=50,
            status='Alert',
            timestamp=timezone.now(),
            sensor_status='online',
            gsm_status='connected'
        )
    
    def test_reading_creation(self):
        """Test reading creation."""
        self.assertEqual(self.reading.water_level_cm, 50)
        self.assertEqual(self.reading.status, 'Alert')
        self.assertEqual(self.reading.sensor_status, 'online')
        self.assertEqual(self.reading.gsm_status, 'connected')
    
    def test_determine_status_normal(self):
        """Test status determination for normal level."""
        reading = WaterLevelReading.objects.create(
            water_level_cm=25,
            timestamp=timezone.now()
        )
        self.assertEqual(reading.status, 'Normal')
    
    def test_determine_status_alert(self):
        """Test status determination for alert level."""
        reading = WaterLevelReading.objects.create(
            water_level_cm=50,
            timestamp=timezone.now()
        )
        self.assertEqual(reading.status, 'Alert')
    
    def test_determine_status_warning(self):
        """Test status determination for warning level."""
        reading = WaterLevelReading.objects.create(
            water_level_cm=65,
            timestamp=timezone.now()
        )
        self.assertEqual(reading.status, 'Warning')
    
    def test_determine_status_danger(self):
        """Test status determination for danger level."""
        reading = WaterLevelReading.objects.create(
            water_level_cm=80,
            timestamp=timezone.now()
        )
        self.assertEqual(reading.status, 'Danger')
    
    def test_reading_str(self):
        """Test reading string representation."""
        str_repr = str(self.reading)
        self.assertIn('50', str_repr)
        self.assertIn('Alert', str_repr)


class WaterLevelAPITest(TestCase):
    """Test cases for Water Level API endpoints."""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='staff'
        )
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='adminpass123',
            role='admin'
        )
        
        # Create test readings
        for i in range(5):
            WaterLevelReading.objects.create(
                water_level_cm=30 + i * 10,
                timestamp=timezone.now() - timezone.timedelta(hours=i)
            )
    
    def test_list_readings_unauthorized(self):
        """Test list readings without authentication."""
        response = self.client.get('/api/water-level/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_list_readings_authorized(self):
        """Test list readings with authentication."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/water-level/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 5)
    
    def test_current_reading(self):
        """Test get current reading."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/water-level/current/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('water_level_cm', response.data)
    
    def test_create_reading_admin_only(self):
        """Test create reading requires admin."""
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/water-level/create/', {
            'water_level_cm': 45,
            'sensor_status': 'online',
            'gsm_status': 'connected'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_create_reading_admin_success(self):
        """Test create reading by admin."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post('/api/water-level/create/', {
            'water_level_cm': 45,
            'sensor_status': 'online',
            'gsm_status': 'connected'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_statistics(self):
        """Test water level statistics."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/water-level/statistics/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('average', response.data)
        self.assertIn('maximum', response.data)
        self.assertIn('minimum', response.data)

    def test_sanitize_incoming_water_level_payload_rejects_noisy_negative_values(self):
        """Noise and impossible sensor values must be rejected before creation."""
        payload = {
            'water_level_cm': -5,
            'raw': -1,
            'status': 'Danger',
            'sensor_status': 'online',
            'gsm_status': 'connected'
        }

        result = sanitize_incoming_water_level_payload(payload)
        self.assertIsNone(result)

    def test_sanitize_incoming_water_level_payload_matches_arduino_thresholds(self):
        """Raw analog values must map to the same thresholds used by the Arduino sketch."""
        for raw_value, expected_status in [(150, 'Normal'), (306, 'Normal'), (307, 'Warning'), (613, 'Warning'), (614, 'Danger')]:
            payload = {
                'raw': raw_value,
                'sensor_status': 'online',
                'gsm_status': 'connected'
            }

            result = sanitize_incoming_water_level_payload(payload)
            self.assertIsNotNone(result)
            self.assertEqual(result['status'], expected_status)
