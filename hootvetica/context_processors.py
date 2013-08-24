from django.conf import settings

def google_analytics(request):
    if settings.DEBUG:
        return {}
    else:
        return {
            'GOOGLE_ANALYTICS_ID': settings.GOOGLE_ANALYTICS_ID,
            'GOOGLE_ANALYTICS_DOMAIN': settings.GOOGLE_ANALYTICS_DOMAIN
        }

def linotype_licensing(request):
    if settings.DEBUG:
        return {}
    else:
        return {'LINOTYPE_LICENSING_URL': settings.LINOTYPE_LICENSING_URL}
