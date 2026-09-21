"""
URL configuration for Water Level module.
"""
from django.urls import path
from .views import (
    WaterLevelReadingListView,
    WaterLevelReadingDetailView,
    WaterLevelReadingCreateView,
    current_water_level_view,
    latest_reading_api,
    water_level_history_view,
    water_level_statistics_view,
    water_level_root_create_view,
)

urlpatterns = [
    path('', water_level_root_create_view, name='reading_create_root'),
    path('readings/', WaterLevelReadingListView.as_view(), name='reading_list'),
    path('readings/<uuid:reading_id>/', WaterLevelReadingDetailView.as_view(), name='reading_detail'),
    path('readings/create/', WaterLevelReadingCreateView.as_view(), name='reading_create'),
    path('current/', current_water_level_view, name='current_level'),
    path('latest/', latest_reading_api, name='latest_level'),
    path('history/', water_level_history_view, name='level_history'),
    path('statistics/', water_level_statistics_view, name='level_statistics'),
]
