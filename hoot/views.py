from django.shortcuts import render
from django.conf import settings
from django.middleware.csrf import REASON_NO_REFERER

def csrf_failure(request, reason=''):
    context = {
        'DEBUG': settings.DEBUG,
        'reason': reason,
        'no_referer': reason == REASON_NO_REFERER
    }
    return render(request, '403_csrf.html', context, status=403)
