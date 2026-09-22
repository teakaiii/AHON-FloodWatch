import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "flood_detection.settings")
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.filter(username="admin").first()

if user is None:
    User.objects.create_user(
        username="admin",
        email="admin@example.com",
        password="admin123",
        is_staff=True,
        is_superuser=True,
    )
else:
    user.set_password("admin123")
    user.email = "admin@example.com"
    user.is_staff = True
    user.is_superuser = True
    user.save()

print("admin ready")
