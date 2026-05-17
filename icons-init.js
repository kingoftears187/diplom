/**
 * Lucide icons: вызывает createIcons после загрузки DOM и при динамическом контенте.
 */
(function () {
    function refreshIcons() {
        if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
            try {
                lucide.createIcons();
            } catch (e) {
                console.warn('lucide.createIcons', e);
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', refreshIcons);
    } else {
        refreshIcons();
    }

    window.refreshIcons = refreshIcons;
})();
