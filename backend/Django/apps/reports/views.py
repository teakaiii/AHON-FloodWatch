"""
Views for Reports module.
"""
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.http import HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from datetime import timedelta, date
from .models import Report
from .serializers import (
    ReportSerializer,
    ReportCreateSerializer
)


class ReportListView(generics.ListAPIView):
    """
    API endpoint to list all reports.
    """
    queryset = Report.objects.select_related('generated_by').all()
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['report_type', 'file_format', 'generated_by']
    search_fields = ['report_type']
    ordering_fields = ['created_at', 'start_date']
    ordering = ['-created_at']


class ReportDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    API endpoint to retrieve, update or delete a report.
    """
    queryset = Report.objects.select_related('generated_by').all()
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'report_id'
    
    def perform_update(self, serializer):
        # Log activity
        from apps.activity_logs.utils import log_activity
        log_activity(
            user=self.request.user,
            action='update',
            entity='report',
            entity_id=str(self.get_object().report_id),
            details=serializer.validated_data
        )
        serializer.save()
    
    def perform_destroy(self, instance):
        # Log activity
        from apps.activity_logs.utils import log_activity
        log_activity(
            user=self.request.user,
            action='delete',
            entity='report',
            entity_id=str(instance.report_id),
            details={'report_type': instance.report_type}
        )
        instance.delete()


class ReportCreateView(generics.CreateAPIView):
    """
    API endpoint to create a report.
    """
    queryset = Report.objects.all()
    serializer_class = ReportCreateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        # Log activity
        from apps.activity_logs.utils import log_activity
        log_activity(
            user=self.request.user,
            action='create',
            entity='report',
            details=serializer.validated_data
        )
        serializer.save()


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def generate_report_view(request):
    """
    API endpoint to generate a report.
    Query parameters:
    - type: daily, weekly, monthly, annual
    - format: pdf, xlsx, csv
    """
    report_type = request.query_params.get('type', 'daily')
    file_format = request.query_params.get('format', 'pdf')
    
    # Determine date range based on report type
    end_date = timezone.now().date()
    
    if report_type == 'daily':
        start_date = end_date - timedelta(days=1)
    elif report_type == 'weekly':
        start_date = end_date - timedelta(weeks=1)
    elif report_type == 'monthly':
        start_date = end_date - timedelta(days=30)
    elif report_type == 'annual':
        start_date = end_date - timedelta(days=365)
    else:
        return Response(
            {'error': 'Invalid report type. Use daily, weekly, monthly, or annual.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Create report record
    report = Report.objects.create(
        report_type=report_type,
        generated_by=request.user,
        start_date=start_date,
        end_date=end_date,
        file_format=file_format
    )
    
    # Generate report file (placeholder - actual implementation would use report generation logic)
    # This would be implemented in a separate service
    
    serializer = ReportSerializer(report)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def report_statistics_view(request):
    """
    API endpoint to get report statistics.
    """
    # Create sample reports if none exist
    if Report.objects.count() == 0:
        from datetime import timedelta
        import random
        report_types = ['daily', 'weekly', 'monthly', 'annual']
        file_formats = ['pdf', 'xlsx', 'csv']
        
        for i in range(5):
            Report.objects.create(
                report_type=random.choice(report_types),
                generated_by=request.user,
                start_date=timezone.now().date() - timedelta(days=random.randint(1, 30)),
                end_date=timezone.now().date(),
                file_format=random.choice(file_formats),
                record_count=random.randint(10, 100)
            )
    
    total_reports = Report.objects.count()
    
    # Count by report type
    type_counts = {}
    for type_choice in Report.REPORT_TYPE_CHOICES:
        type_name = type_choice[0]
        count = Report.objects.filter(report_type=type_name).count()
        type_counts[type_name] = count
    
    # Count by file format
    format_counts = {}
    for format_choice in Report.FILE_FORMAT_CHOICES:
        format_name = format_choice[0]
        count = Report.objects.filter(file_format=format_name).count()
        format_counts[format_name] = count
    
    data = {
        'total_reports': total_reports,
        'type_counts': type_counts,
        'format_counts': format_counts
    }
    
    return Response(data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def export_report_view(request):
    """
    API endpoint to export a comprehensive flood detection report as PDF.
    """
    try:
        import io
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        
        # Create PDF buffer
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1976d2'),
            spaceAfter=30,
        )
        
        subtitle_style = ParagraphStyle(
            'CustomSubtitle',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#424242'),
            spaceAfter=12,
        )
        
        # Title
        elements.append(Paragraph("Flood Detection Report", title_style))
        elements.append(Paragraph(f"Generated: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
        elements.append(Spacer(1, 20))
        
        # Water Level Summary
        try:
            from apps.water_level.models import WaterLevelReading
            elements.append(Paragraph("Water Level Summary", subtitle_style))
            water_readings = WaterLevelReading.objects.all().order_by('-timestamp')[:10]
            if water_readings.exists():
                water_data = [['Timestamp', 'Water Level (cm)', 'Status']]
                for reading in water_readings:
                    water_data.append([
                        reading.timestamp.strftime('%Y-%m-%d %H:%M') if reading.timestamp else 'N/A',
                        f"{reading.water_level_cm}",
                        reading.status
                    ])
                water_table = Table(water_data)
                water_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976d2')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 12),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ]))
                elements.append(water_table)
            else:
                elements.append(Paragraph("No water level data available.", styles['Normal']))
            elements.append(Spacer(1, 20))
        except Exception as e:
            elements.append(Paragraph(f"Water Level data error: {str(e)}", styles['Normal']))
            elements.append(Spacer(1, 20))
        
        # Active Alerts
        try:
            from apps.alerts.models import Alert
            elements.append(Paragraph("Active Alerts", subtitle_style))
            active_alerts = Alert.objects.filter(status='active').order_by('-created_at')[:10]
            if active_alerts.exists():
                alert_data = [['Created', 'Alert Type', 'Severity', 'Status']]
                for alert in active_alerts:
                    alert_data.append([
                        alert.created_at.strftime('%Y-%m-%d %H:%M') if alert.created_at else 'N/A',
                        alert.alert_type,
                        alert.severity,
                        alert.status
                    ])
                alert_table = Table(alert_data)
                alert_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f57c00')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 12),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ]))
                elements.append(alert_table)
            else:
                elements.append(Paragraph("No active alerts.", styles['Normal']))
            elements.append(Spacer(1, 20))
        except Exception as e:
            elements.append(Paragraph(f"Alerts data error: {str(e)}", styles['Normal']))
            elements.append(Spacer(1, 20))
        
        # Residents Summary
        try:
            from apps.residents.models import Resident
            elements.append(Paragraph("Residents Summary", subtitle_style))
            total_residents = Resident.objects.count()
            active_residents = Resident.objects.filter(is_active=True).count()
            resident_data = [
                ['Metric', 'Count'],
                ['Total Residents', str(total_residents)],
                ['Active Residents', str(active_residents)],
                ['Inactive Residents', str(total_residents - active_residents)]
            ]
            resident_table = Table(resident_data)
            resident_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#388e3c')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ]))
            elements.append(resident_table)
            elements.append(Spacer(1, 20))
        except Exception as e:
            elements.append(Paragraph(f"Residents data error: {str(e)}", styles['Normal']))
            elements.append(Spacer(1, 20))
        
        # SMS Statistics
        try:
            from apps.sms.models import SMSLog
            elements.append(Paragraph("SMS Statistics (Last 24 Hours)", subtitle_style))
            yesterday = timezone.now() - timedelta(days=1)
            recent_sms = SMSLog.objects.filter(sent_at__gte=yesterday)
            sent_count = recent_sms.filter(status='sent').count()
            failed_count = recent_sms.filter(status='failed').count()
            sms_data = [
                ['Metric', 'Count'],
                ['SMS Sent', str(sent_count)],
                ['SMS Failed', str(failed_count)],
                ['Total', str(sent_count + failed_count)]
            ]
            sms_table = Table(sms_data)
            sms_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#7b1fa2')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ]))
            elements.append(sms_table)
        except Exception as e:
            elements.append(Paragraph(f"SMS data error: {str(e)}", styles['Normal']))
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        
        # Create response
        response = HttpResponse(buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="flood_report_{timezone.now().strftime("%Y-%m-%d")}.pdf"'
        
        return response
        
    except Exception as e:
        return Response(
            {'error': f'Failed to generate report: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
