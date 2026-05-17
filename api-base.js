/**
 * Базовый URL бэкенда (Node + SQLite). Для Live Server «html на :5500, API на :3000»
 * добавьте в <head>:
 * <meta name="tn-api-origin" content="http://127.0.0.1:3000">
 * или window.__TN_API_ORIGIN__ = 'http://127.0.0.1:4000';
 */
(function () {
    function tnApiSiteOrigin() {
        if (typeof window === 'undefined') return 'http://localhost:3000';

        if (window.location.protocol === 'file:') return 'http://localhost:3000';

        if (window.__TN_API_ORIGIN__) {
            return String(window.__TN_API_ORIGIN__).replace(/\/$/, '');
        }

        var meta = document.querySelector('meta[name="tn-api-origin"]');
        if (meta && meta.content && meta.content.trim()) {
            return meta.content.trim().replace(/\/$/, '');
        }

        var h = window.location.hostname;
        if (h === 'localhost' || h === '127.0.0.1') {
            var po = window.location.port;
            if (po === '3000') return window.location.origin;
            return window.location.protocol + '//' + h + ':3000';
        }

        return window.location.origin;
    }

    window.getApiSiteOrigin = tnApiSiteOrigin;
})();
