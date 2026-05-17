/**
 * СИСТЕМА МОБИЛЬНОГО МЕНЮ
 * Управление навигацией на мобильных устройствах
 */

function refreshMenuToggleIcon(btn, menuOpen) {
    btn.innerHTML = menuOpen
        ? '<i data-lucide="x" class="ico ico-nav"></i>'
        : '<i data-lucide="menu" class="ico ico-nav"></i>';
    if (typeof refreshIcons === 'function') refreshIcons();
}

function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    if (!mobileMenuBtn || !mobileMenu) return;

    mobileMenuBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        mobileMenu.classList.toggle('hidden');
        refreshMenuToggleIcon(mobileMenuBtn, !mobileMenu.classList.contains('hidden'));
    });

    const menuLinks = mobileMenu.querySelectorAll('a');
    menuLinks.forEach(link => {
        link.addEventListener('click', function () {
            mobileMenu.classList.add('hidden');
            refreshMenuToggleIcon(mobileMenuBtn, false);
        });
    });

    document.addEventListener('click', function (e) {
        if (!mobileMenu.contains(e.target) && e.target !== mobileMenuBtn) {
            mobileMenu.classList.add('hidden');
            refreshMenuToggleIcon(mobileMenuBtn, false);
        }
    });
}

window.addEventListener('DOMContentLoaded', initMobileMenu);
