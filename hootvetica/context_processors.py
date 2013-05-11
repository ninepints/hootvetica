from django.conf import settings

def google_analytics(request):
    if settings.DEBUG:
        return {}
    else:
        return {
            'GOOGLE_ANALYTICS_ID': settings.GOOGLE_ANALYTICS_ID,
            'GOOGLE_ANALYTICS_DOMAIN': settings.GOOGLE_ANALYTICS_DOMAIN
        }
