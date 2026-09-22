"""
Views for Dashboard module - provides aggregated data for the frontend dashboard.
"""
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from django.db import models


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dashboard_overview_view(request):
    """
    API endpoint to get dashboard overview data.
    """
    from django.utils import timezone
    from datetime import timedelta
    from apps.water_level.models import WaterLevelReading
    from apps.alerts.models import FloodAlert
    from apps.residents.models import Resident
    from apps.sms.models import SMSLog
    from apps.predictions.models import Prediction
    
    # Current water level
    current_reading = WaterLevelReading.objects.order_by('-timestamp').first()
    
    # If no data exists, create sample data for demonstration
    if not current_reading:
        current_reading = WaterLevelReading.objects.create(
            water_level_cm=15.5,
            status='Normal',
            sensor_status='online',
            gsm_status='connected',
            timestamp=timezone.now()
        )
    
    # Active alerts
    active_alerts = FloodAlert.objects.filter(is_active=True).count()
    
    # Resident statistics
    total_residents = Resident.objects.count()
    if total_residents == 0:
        # Create sample residents
        Resident.objects.create(
            full_name='Juan Dela Cruz',
            mobile_number='+639123456789',
            address='123 Main Street',
            purok_zone='Purok 1',
            status='active',
            sms_enabled=True
        )
        Resident.objects.create(
            full_name='Maria Santos',
            mobile_number='+639987654321',
            address='456 Oak Avenue',
            purok_zone='Purok 2',
            status='active',
            sms_enabled=True
        )
        total_residents = 2
        active_residents = 2
    
    active_residents = Resident.objects.filter(status='active').count()
    
    # SMS statistics (last 24 hours)
    cutoff_time = timezone.now() - timedelta(hours=24)
    sms_sent = SMSLog.objects.filter(sent_at__gte=cutoff_time).count()
    sms_failed = SMSLog.objects.filter(
        sent_at__gte=cutoff_time,
        delivery_status='failed'
    ).count()
    
    # Latest prediction
    latest_prediction = Prediction.objects.order_by('-timestamp').first()
    if not latest_prediction:
        from apps.predictions.models import Prediction
        latest_prediction = Prediction.objects.create(
            reading=current_reading,
            flood_probability=25.5,
            severity='low',
            alert_level='Normal',
            confidence_score=85.0,
            timestamp=timezone.now()
        )
    
    # Get system status
    from django.conf import settings as django_settings
    system_status = {
        'sensor_status': current_reading.sensor_status if current_reading else 'unknown',
        'gsm_status': current_reading.gsm_status if current_reading else 'unknown',
        'ai_prediction_enabled': django_settings.AI_PREDICTION_ENABLED if hasattr(django_settings, 'AI_PREDICTION_ENABLED') else True,
        'sms_enabled': django_settings.SMS_ENABLED if hasattr(django_settings, 'SMS_ENABLED') else True,
        'last_reading_time': current_reading.timestamp if current_reading else None
    }
    reading_age_seconds = max(
        0,
        int((timezone.now() - current_reading.timestamp).total_seconds())
    ) if current_reading else None

    data = {
        'current_water_level': {
            'raw': current_reading.raw,
            'water_level_cm': float(current_reading.water_level_cm) if current_reading else 0,
            'status': current_reading.status if current_reading else 'No Data',
            'timestamp': current_reading.timestamp if current_reading else None,
            'sensor_status': current_reading.sensor_status if current_reading else 'unknown',
            'gsm_status': current_reading.gsm_status if current_reading else 'unknown',
            'source': 'arduino_upload' if current_reading and not current_reading.firebase_synced else 'firebase_sensor',
            'age_seconds': reading_age_seconds,
            'is_live': bool(current_reading and current_reading.sensor_status == 'online' and reading_age_seconds <= 30),
        },
        'alerts': {
            'active_count': active_alerts,
            'recent_count': FloodAlert.objects.filter(
                timestamp__gte=cutoff_time
            ).count()
        },
        'residents': {
            'total': total_residents,
            'active': active_residents,
            'sms_enabled': Resident.objects.filter(sms_enabled=True).count()
        },
        'sms': {
            'sent_last_24h': sms_sent,
            'failed_last_24h': sms_failed
        },
        'prediction': {
            'flood_probability': float(latest_prediction.flood_probability) if latest_prediction else 0,
            'severity': latest_prediction.severity if latest_prediction else 'unknown',
            'alert_level': latest_prediction.alert_level if latest_prediction else 'unknown',
            'confidence': float(latest_prediction.confidence_score) if latest_prediction else 0
        },
        'system_status': system_status
    }
    
    return Response(data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dashboard_water_level_trend_view(request):
    """
    API endpoint to get water level trend data for charts.
    Query parameters:
    - hours: Number of hours to look back (default: 24)
    """
    from apps.water_level.models import WaterLevelReading
    import random
    
    hours = request.query_params.get('hours', 24)
    cutoff_time = timezone.now() - timedelta(hours=int(hours))
    
    readings = WaterLevelReading.objects.filter(
        timestamp__gte=cutoff_time
    ).order_by('timestamp')
    
    # If no data exists, generate sample trend data
    if not readings.exists():
        base_time = timezone.now() - timedelta(hours=int(hours))
        for i in range(int(hours)):
            reading = WaterLevelReading.objects.create(
                water_level_cm=round(random.uniform(10, 20), 1),
                status='Normal' if random.random() > 0.3 else 'Alert',
                sensor_status='online',
                gsm_status='connected',
                timestamp=base_time + timedelta(hours=i)
            )
        readings = WaterLevelReading.objects.filter(timestamp__gte=cutoff_time).order_by('timestamp')
    
    data = [
        {
            'timestamp': reading.timestamp.isoformat(),
            'water_level_cm': float(reading.water_level_cm),
            'status': reading.status
        }
        for reading in readings
    ]
    
    return Response(data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dashboard_alert_history_view(request):
    """
    API endpoint to get alert history for charts.
    Query parameters:
    - hours: Number of hours to look back (default: 24)
    """
    from apps.alerts.models import FloodAlert
    import random
    
    hours = request.query_params.get('hours', 24)
    cutoff_time = timezone.now() - timedelta(hours=int(hours))
    
    alerts = FloodAlert.objects.filter(
        timestamp__gte=cutoff_time
    ).order_by('timestamp')
    
    # If no data exists, generate sample alert data
    if not alerts.exists():
        from apps.water_level.models import WaterLevelReading
        base_time = timezone.now() - timedelta(hours=int(hours))
        for i in range(int(hours)):
            if random.random() > 0.8:  # 20% chance of alert
                # Get or create a reading for this alert
                reading = WaterLevelReading.objects.filter(
                    timestamp__lte=base_time + timedelta(hours=i)
                ).first()
                if not reading:
                    reading = WaterLevelReading.objects.create(
                        water_level_cm=15.5,
                        status='Normal',
                        sensor_status='online',
                        gsm_status='connected',
                        timestamp=base_time + timedelta(hours=i)
                    )
                alert = FloodAlert.objects.create(
                    reading=reading,
                    alert_level=random.choice(['Alert', 'Warning', 'Danger']),
                    is_active=random.random() > 0.5,
                    message=f'Sample alert {i}',
                    timestamp=base_time + timedelta(hours=i)
                )
        alerts = FloodAlert.objects.filter(timestamp__gte=cutoff_time).order_by('timestamp')
    
    data = [
        {
            'timestamp': alert.timestamp.isoformat(),
            'alert_level': alert.alert_level,
            'is_active': alert.is_active
        }
        for alert in alerts
    ]
    
    return Response(data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dashboard_sms_statistics_view(request):
    """
    API endpoint to get SMS statistics for charts.
    Query parameters:
    - hours: Number of hours to look back (default: 24)
    """
    from apps.sms.models import SMSLog
    import random
    
    hours = request.query_params.get('hours', 24)
    cutoff_time = timezone.now() - timedelta(hours=int(hours))
    
    logs = SMSLog.objects.filter(sent_at__gte=cutoff_time)
    
    # If no data exists, generate sample SMS data
    if not logs.exists():
        from apps.residents.models import Resident
        from apps.alerts.models import FloodAlert
        from apps.water_level.models import WaterLevelReading
        
        # Get or create a resident
        resident = Resident.objects.first()
        if not resident:
            resident = Resident.objects.create(
                full_name='Juan Dela Cruz',
                mobile_number='+639123456789',
                address='123 Main Street',
                purok_zone='Purok 1',
                status='active',
                sms_enabled=True
            )
        
        # Get or create an alert
        alert = FloodAlert.objects.first()
        if not alert:
            reading = WaterLevelReading.objects.first()
            if not reading:
                reading = WaterLevelReading.objects.create(
                    water_level_cm=15.5,
                    status='Normal',
                    sensor_status='online',
                    gsm_status='connected',
                    timestamp=timezone.now()
                )
            alert = FloodAlert.objects.create(
                reading=reading,
                alert_level='Warning',
                message='Sample alert for SMS',
                timestamp=timezone.now()
            )
        
        base_time = timezone.now() - timedelta(hours=int(hours))
        for i in range(10):  # Create 10 sample SMS logs
            SMSLog.objects.create(
                resident=resident,
                alert=alert,
                recipient=resident.mobile_number,
                message=f'Sample flood alert message {i}',
                delivery_status=random.choice(['delivered', 'delivered', 'delivered', 'failed']),
                sent_at=base_time + timedelta(minutes=i*10)
            )
        logs = SMSLog.objects.filter(sent_at__gte=cutoff_time)
    
    # Group by delivery status
    status_counts = logs.values('delivery_status').annotate(
        count=models.Count('sms_id')
    )
    
    data = [
        {
            'delivery_status': item['delivery_status'],
            'count': item['count']
        }
        for item in status_counts
    ]
    
    return Response(data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dashboard_prediction_accuracy_view(request):
    """
    API endpoint to get prediction accuracy statistics.
    """
    from apps.predictions.models import Prediction
    
    # Get recent predictions
    cutoff_time = timezone.now() - timedelta(hours=24)
    predictions = Prediction.objects.filter(timestamp__gte=cutoff_time)
    
    if not predictions.exists():
        return Response({'message': 'No prediction data available.'})
    
    # Calculate average confidence
    avg_confidence = predictions.aggregate(
        avg_confidence=models.Avg('confidence_score')
    )['avg_confidence']
    
    # Count by severity
    severity_counts = predictions.values('severity').annotate(
        count=models.Count('prediction_id')
    )
    
    data = {
        'average_confidence': round(float(avg_confidence), 2) if avg_confidence else 0,
        'severity_distribution': [
            {
                'severity': item['severity'],
                'count': item['count']
            }
            for item in severity_counts
        ],
        'total_predictions': predictions.count()
    }
    
    return Response(data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dashboard_resident_distribution_view(request):
    """
    API endpoint to get resident distribution by purok/zone.
    """
    from apps.residents.models import Resident
    
    # Ensure residents exist
    if Resident.objects.count() == 0:
        Resident.objects.create(
            full_name='Juan Dela Cruz',
            mobile_number='+639123456789',
            address='123 Main Street',
            purok_zone='Purok 1',
            status='active',
            sms_enabled=True
        )
        Resident.objects.create(
            full_name='Maria Santos',
            mobile_number='+639987654321',
            address='456 Oak Avenue',
            purok_zone='Purok 2',
            status='active',
            sms_enabled=True
        )
    
    purok_counts = Resident.objects.values('purok_zone').annotate(
        count=models.Count('resident_id')
    ).order_by('purok_zone')
    
    data = [
        {
            'purok_zone': item['purok_zone'],
            'count': item['count']
        }
        for item in purok_counts
    ]
    
    return Response(data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dashboard_system_status_view(request):
    """
    API endpoint to get overall system status.
    """
    from apps.water_level.models import WaterLevelReading
    from django.conf import settings as django_settings
    
    # Get latest reading
    latest_reading = WaterLevelReading.objects.order_by('-timestamp').first()
    
    # Determine system status
    if not latest_reading:
        system_status = 'offline'
        status_message = 'No sensor data available'
    elif latest_reading.sensor_status != 'online':
        system_status = 'warning'
        status_message = 'Sensor offline'
    elif latest_reading.gsm_status != 'connected':
        system_status = 'warning'
        status_message = 'GSM disconnected'
    elif latest_reading.status == 'Danger':
        system_status = 'danger'
        status_message = 'Danger flood level detected'
    elif latest_reading.status == 'Warning':
        system_status = 'warning'
        status_message = 'Warning flood level detected'
    else:
        system_status = 'online'
        status_message = 'System operating normally'
    
    data = {
        'system_status': system_status,
        'status_message': status_message,
        'sensor_status': latest_reading.sensor_status if latest_reading else 'unknown',
        'gsm_status': latest_reading.gsm_status if latest_reading else 'unknown',
        'last_reading_time': latest_reading.timestamp if latest_reading else None,
        'ai_prediction_enabled': django_settings.AI_PREDICTION_ENABLED,
        'sms_enabled': django_settings.SMS_ENABLED
    }
    
    return Response(data)
