(function () {
  'use strict';

  function each(list, action) { Array.prototype.forEach.call(list, action); }
  var toastTimer;
  function toast(message) {
    var box = document.getElementById('qqToast');
    if (!box) {
      box = document.createElement('div');
      box.id = 'qqToast';
      box.className = 'qq-toast';
      box.setAttribute('role', 'status');
      box.setAttribute('aria-live', 'polite');
      document.body.appendChild(box);
    }
    box.textContent = message;
    box.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.classList.remove('on'); }, 2400);
  }

  function legacyCopy(text, callback) {
    var previous = document.activeElement;
    var field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.cssText = 'position:fixed;left:-9999px;top:0;';
    document.body.appendChild(field);
    field.select();
    var success = false;
    try { success = document.execCommand('copy'); } catch (ignored) {}
    field.remove();
    if (previous && previous.focus) previous.focus();
    callback(success);
  }

  function copy(text, callback) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { callback(true); }, function () {
        legacyCopy(text, callback);
      });
      return;
    }
    legacyCopy(text, callback);
  }

  each(document.querySelectorAll('[data-qq], [data-copy], [data-copy-target]'), function (button) {
    button.addEventListener('click', function () {
      var text = button.getAttribute('data-copy') || button.getAttribute('data-qq');
      var target = button.getAttribute('data-copy-target');
      if (target) {
        var source = document.getElementById(target);
        if (!source) return;
        text = source.innerText || source.textContent;
      }
      if (!text || button.disabled) return;
      button.disabled = true;
      copy(text, function (success) {
        button.disabled = false;
        if (success) {
          toast('已复制到剪贴板');
          return;
        }
        toast('复制未成功，请长按或选中页面文字手动复制。');
      });
    });
  });

  var nav = document.querySelector('.nav');
  var menu = document.getElementById('mainNavigation');
  var toggle = document.getElementById('menuToggle');
  if (nav && menu && toggle) {
    function closeMenu() {
      toggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('menu-open');
    }
    toggle.addEventListener('click', function () {
      if (toggle.getAttribute('aria-expanded') === 'true') { closeMenu(); return; }
      toggle.setAttribute('aria-expanded', 'true');
      nav.classList.add('menu-open');
    });
    menu.addEventListener('click', function (event) {
      if (event.target.closest('a')) closeMenu();
    });
    document.addEventListener('click', function (event) {
      if (!nav.contains(event.target)) closeMenu();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        toggle.focus();
      }
    });
    nav.classList.add('nav-ready');
  }

  // One active overlay owns background inertness, scroll lock and focus restoration.
  var activeOverlay;
  var returnFocus;
  var oldOverflow;
  var backgrounds = [];
  function closeOverlay() {
    if (!activeOverlay) return;
    activeOverlay.classList.remove('on');
    activeOverlay.hidden = true;
    document.body.style.overflow = oldOverflow;
    each(backgrounds, function (entry) { entry.element.inert = entry.inert; });
    backgrounds = [];
    activeOverlay = null;
    if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
  }
  function openOverlay(box, trigger, firstFocus) {
    if (activeOverlay) closeOverlay();
    returnFocus = trigger;
    oldOverflow = document.body.style.overflow;
    activeOverlay = box;
    box.hidden = false;
    box.classList.add('on');
    document.body.style.overflow = 'hidden';
    each(document.querySelectorAll('nav, main, footer, .qq-float-group'), function (element) {
      if ('inert' in element) {
        backgrounds.push({element: element, inert: element.inert});
        element.inert = true;
      }
    });
    firstFocus.focus();
  }
  document.addEventListener('keydown', function (event) {
    if (!activeOverlay) return;
    if (event.key === 'Escape') { event.preventDefault(); closeOverlay(); return; }
    if (event.key !== 'Tab') return;
    var nodes = activeOverlay.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]');
    var first = nodes[0];
    var last = nodes[nodes.length - 1];
    if (!first) return;
    if (event.shiftKey && (document.activeElement === first || !activeOverlay.contains(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !activeOverlay.contains(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  });

  var modal = document.getElementById('dlModal');
  if (modal) {
    var agree = document.getElementById('dlAgree');
    var confirm = document.getElementById('dlConfirm');
    var cancel = document.getElementById('dlCancel');
    var pending;
    each(document.querySelectorAll('a[href$=".apk"], a[href*=".apk?"]'), function (anchor) {
      anchor.addEventListener('click', function (event) {
        event.preventDefault();
        pending = anchor.href;
        agree.checked = false;
        confirm.disabled = true;
        openOverlay(modal, anchor, agree);
      });
    });
    agree.addEventListener('change', function () { confirm.disabled = !agree.checked; });
    cancel.addEventListener('click', closeOverlay);
    modal.addEventListener('click', function (event) { if (event.target === modal) closeOverlay(); });
    confirm.addEventListener('click', function () {
      if (!agree.checked || !pending || confirm.disabled) return;
      var url = pending;
      pending = null;
      closeOverlay();
      window.location.assign(url);
    });
  }

  var lightbox = document.getElementById('lightbox');
  if (lightbox) {
    var large = document.getElementById('lightbox-img');
    var close = lightbox.querySelector('.lightbox-close');
    var caption = lightbox.querySelector('.lightbox-caption');
    each(document.querySelectorAll('img[data-zoom]'), function (image) {
      image.tabIndex = 0;
      image.setAttribute('role', 'button');
      image.setAttribute('aria-label', '放大截图：' + image.alt);
      function show() {
        large.src = image.currentSrc || image.src;
        large.alt = image.alt;
        caption.textContent = image.alt;
        openOverlay(lightbox, image, close);
      }
      image.addEventListener('click', show);
      image.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); show(); }
      });
    });
    close.addEventListener('click', closeOverlay);
    lightbox.addEventListener('click', function (event) { if (event.target === lightbox) closeOverlay(); });
  }

  // Keep the glass surfaces calm at rest and choreograph their arrival on scroll.
  var revealTargets = document.querySelectorAll('.section, .community-band, .release-strip, .download-intro, .pick-card, .feat, .step, .faq-item, .report-box, .footer');
  each(revealTargets, function (element, index) {
    element.classList.add('reveal');
    element.style.transitionDelay = Math.min((index % 6) * 70, 350) + 'ms';
  });
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries, self) {
      each(entries, function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        self.unobserve(entry.target);
      });
    }, {rootMargin: '0px 0px -10% 0px', threshold: 0.08});
    each(revealTargets, function (element) { observer.observe(element); });
  } else {
    each(revealTargets, function (element) { element.classList.add('is-visible'); });
  }

  each(document.querySelectorAll('details.faq-item'), function (item) {
    item.addEventListener('toggle', function () {
      if (item.open) item.scrollIntoView({block: 'nearest', behavior: 'smooth'});
    });
  });
})();
