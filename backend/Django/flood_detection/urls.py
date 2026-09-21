"""
URL configuration for flood_detection project.
"""
from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse
from rest_framework import permissions
from rest_framework.decorators import api_view
from rest_framework.response import Response
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

from . import admin as _admin_branding  # noqa: F401  (applies admin site branding)

schema_view = get_schema_view(
    openapi.Info(
        title="AHON FloodWatch API",
        default_version='v1',
        description="API documentation for AHON FloodWatch - Barangay Tonsuya Flood Detection System",
        terms_of_service="https://www.google.com/policies/terms/",
        contact=openapi.Contact(email="admin@barangay-tonsuya.gov.ph"),
        license=openapi.License(name="BSD License"),
        x_logo={
            "url": "/static/images/logo.png",
            "altText": "AHON FloodWatch Logo",
            "backgroundColor": "#FFFFFF",
        }
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

@api_view(['GET'])
def api_root(request):
    """
    API root endpoint that lists all available API endpoints.
    """
    return Response({
        'message': 'Welcome to AHON FloodWatch API',
        'version': 'v1',
        'endpoints': {
            'authentication': '/api/auth/',
            'water_level': '/api/water-level/',
            'residents': '/api/residents/',
            'alerts': '/api/alerts/',
            'sms': '/api/sms/',
            'predictions': '/api/predictions/',
            'reports': '/api/reports/',
            'notifications': '/api/notifications/',
            'activity_logs': '/api/activity-logs/',
            'settings': '/api/settings/',
            'dashboard': '/api/dashboard/',
            'documentation': '/swagger/',
            'admin': '/admin/',
        },
        'documentation': {
            'swagger': '/swagger/',
            'redoc': '/redoc/',
            'swagger_json': '/swagger.json',
        }
    })


def project_root(request):
    """Serve the AHON FloodWatch login page at the root URL."""
    html = """
    <html>
      <head>
        <title>AHON FloodWatch</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body {
            margin: 0;
            background: #f2f2f2;
            font-family: Arial, Helvetica, sans-serif;
            color: #1a1a1a;
          }
          .topbar {
            background: #4a2a1d;
            height: 52px;
            display: flex;
            align-items: center;
            padding: 0 18px;
            color: white;
            font-weight: bold;
            box-sizing: border-box;
          }
          .topbar .brand {
            font-size: 18px;
            letter-spacing: 0.5px;
          }
          .page {
            min-height: calc(100vh - 52px);
            display: flex;
            justify-content: center;
            align-items: center;
            background: #f2f2f2;
          }
          .card {
            width: 420px;
            background: #f7f7f7;
            border: 1px solid #d9d9d9;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
            padding: 28px 28px 20px;
            box-sizing: border-box;
          }
          .logo-wrap {
            display: flex;
            justify-content: center;
            margin-bottom: 12px;
          }
          .logo {
            width: 74px;
            height: 74px;
            border-radius: 50%;
            background: #0e2d4d;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 26px;
            border: 4px solid #dfe9f2;
          }
          h1 {
            text-align: center;
            margin: 0 0 6px;
            font-size: 30px;
            font-weight: 700;
          }
          .subtitle {
            text-align: center;
            font-size: 15px;
            color: #666;
            margin-bottom: 20px;
          }
          form {
            display: flex;
            flex-direction: column;
            gap: 14px;
          }
          label {
            display: block;
            font-size: 14px;
            margin-bottom: 6px;
            color: #333;
          }
          input {
            width: 100%;
            box-sizing: border-box;
            border: 1px solid #b9cfe0;
            background: #edf3fa;
            border-radius: 6px;
            padding: 12px 14px;
            font-size: 16px;
            outline: none;
          }
          input:focus {
            border-color: #4c7ef3;
            box-shadow: 0 0 0 2px rgba(76,126,243,0.12);
          }
          .login-btn {
            margin-top: 10px;
            width: 100%;
            background: #1f7fe6;
            color: #fff;
            border: none;
            border-radius: 6px;
            padding: 12px 16px;
            font-size: 18px;
            cursor: pointer;
            font-weight: 600;
          }
          .footer {
            text-align: center;
            margin-top: 22px;
            font-size: 12px;
            color: #777;
          }
        </style>
      </head>
      <body>
        <div class="topbar">
          <div class="brand">AHON FloodWatch</div>
        </div>

        <div class="page">
          <div class="card">
            <div class="logo-wrap">
              <div class="logo">A</div>
            </div>

            <h1>AHON FloodWatch</h1>
            <div class="subtitle">Barangay Tonsuya, Malabon</div>

            <form method="post" action="/admin/login/">
              <div>
                <label for="username">Username</label>
                <input id="username" name="username" type="text" value="admin" />
              </div>
              <div>
                <label for="password">Password</label>
                <input id="password" name="password" type="password" value="admin123" />
              </div>
              <button type="submit" class="login-btn">Sign In</button>
            </form>

            <div class="footer">© 2026 AHON FloodWatch - Barangay Tonsuya</div>
          </div>
        </div>
      </body>
    </html>
    """
    return HttpResponse(html, content_type="text/html")

urlpatterns = [
    # Root URL - public landing page
    path('', project_root),
    
    path('admin/', admin.site.urls),
    
    # API Documentation
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    path('swagger.json', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    
    # API Root
    path('api/', api_root),
    
    # API Endpoints
    path('api/auth/', include('apps.authentication.urls')),
    path('api/water-level/', include('apps.water_level.urls')),
    path('api/residents/', include('apps.residents.urls')),
    path('api/alerts/', include('apps.alerts.urls')),
    path('api/sms/', include('apps.sms.urls')),
    path('api/predictions/', include('apps.predictions.urls')),
    path('api/reports/', include('apps.reports.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/activity-logs/', include('apps.activity_logs.urls')),
    path('api/settings/', include('apps.settings.urls')),
    path('api/dashboard/', include('apps.dashboard.urls')),
]
