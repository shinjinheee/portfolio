/* ===========================================================
   main.js
   라이브러리(gsap) 뒤에 로드된다. — 설계서 §2
   각 init는 대상 요소가 없으면 조용히 빠져나간다.
   =========================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -----------------------------------------------------------
     헤더 — 스크롤하면 하단 경계선을 드러낸다
     ----------------------------------------------------------- */
  function initHeader() {
    var header = document.querySelector('[data-header]');
    if (!header) return;

    var ticking = false;
    function update() {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  /* -----------------------------------------------------------
     모바일 메뉴 토글
     ----------------------------------------------------------- */
  function initNavToggle() {
    var btn = document.querySelector('[data-nav-toggle]');
    var gnb = document.querySelector('.gnb');
    if (!btn || !gnb) return;

    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      btn.setAttribute('aria-label', open ? '메뉴 열기' : '메뉴 닫기');
      gnb.classList.toggle('is-open', !open);
    });

    gnb.addEventListener('click', function (e) {
      if (e.target.tagName !== 'A') return;
      btn.setAttribute('aria-expanded', 'false');
      gnb.classList.remove('is-open');
    });
  }

  /* -----------------------------------------------------------
     아카이브 마퀴
     트랙을 한 벌 복제해 이어붙인 뒤 -50%까지 밀면 이음매가 없다.
     data-direction="right" 는 역방향.
     ----------------------------------------------------------- */
  function initMarquee() {
    var tracks = document.querySelectorAll('[data-marquee-track]');
    if (!tracks.length) return;

    // GSAP이 없거나 모션 최소화 설정이면 정적 목록으로 남긴다
    if (reduceMotion || typeof window.gsap === 'undefined') return;

    Array.prototype.forEach.call(tracks, function (track) {
      var originals = Array.prototype.slice.call(track.children);
      if (!originals.length) return;

      originals.forEach(function (node) {
        var clone = node.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.appendChild(clone);
      });

      var toRight = track.dataset.direction === 'right';
      var tween = window.gsap.fromTo(
        track,
        { xPercent: toRight ? -50 : 0 },
        {
          xPercent: toRight ? 0 : -50,
          duration: 60,
          ease: 'none',
          repeat: -1
        }
      );

      // hover 시 감속 — 설계서 §5-4
      var row = track.parentElement;
      row.addEventListener('mouseenter', function () {
        window.gsap.to(tween, { timeScale: 0.25, duration: 0.6 });
      });
      row.addEventListener('mouseleave', function () {
        window.gsap.to(tween, { timeScale: 1, duration: 0.6 });
      });
    });
  }

  /* -----------------------------------------------------------
     연도 탭 (archive) — 보고 있는 연도 그룹을 표시한다
     ----------------------------------------------------------- */
  /**
   * 마퀴를 디바이스 픽셀 경계에 맞춘다.
   *
   * 카드의 좌우 테두리는 정수 픽셀에 떨어지는데 위아래만 소수로 떨어져
   * 두 픽셀에 절반씩 나뉘어 흐려 보였다 (실측: 좌 560.000 / 하 8998.406).
   * 카드가 문제가 아니라 마퀴가 놓인 세로 위치가 소수여서인데, 그 소수는
   * 위쪽 텍스트 블록(line-height 27.552)과 유동 폭 이미지들의 소수 높이가
   * 쌓인 결과라 CSS 로는 없앨 수 없다. 남는 만큼만 여기서 밀어 준다.
   */
  function initPixelSnap() {
    var marquee = document.querySelector('[data-marquee]');
    if (!marquee) return;

    function snap() {
      marquee.style.transform = '';
      var dpr = window.devicePixelRatio || 1;
      var top = marquee.getBoundingClientRect().top + window.pageYOffset;
      var off = Math.round(top * dpr) / dpr - top;
      // 0.5px 미만만 보정한다 — 레이아웃을 옮기려는 게 아니다
      if (off) marquee.style.transform = 'translateY(' + off + 'px)';
    }

    snap();
    window.addEventListener('resize', snap);
    // 폰트가 늦게 붙으면 위쪽 높이가 바뀐다
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(snap);
  }

  function initYearTabs() {
    var wrap = document.querySelector('[data-year-tabs]');
    if (!wrap) return;

    var pairs = [];
    [].slice.call(wrap.querySelectorAll('a[href^="#"]')).forEach(function (a) {
      var g = document.querySelector(a.getAttribute('href'));
      if (g) pairs.push({ link: a, group: g });
    });
    if (!pairs.length) return;

    // 고정 바(헤더 + 탭) 아래 첫 픽셀을 기준선으로 삼는다
    function offset() {
      var h = document.querySelector('.site-header');
      return (h ? h.getBoundingClientRect().height : 0) + wrap.getBoundingClientRect().height;
    }

    var ticking = false;
    function update() {
      ticking = false;
      var line = offset() + 1;
      var active = pairs[0];
      pairs.forEach(function (p) {
        if (p.group.getBoundingClientRect().top <= line) active = p;
      });
      // 맨 아래에 닿으면 마지막 연도를 활성으로
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 2) {
        active = pairs[pairs.length - 1];
      }
      pairs.forEach(function (p) {
        if (p === active) p.link.setAttribute('aria-current', 'true');
        else p.link.removeAttribute('aria-current');
      });
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* -----------------------------------------------------------
     아카이브 모달
     데이터는 <script type="application/json" id="modal-data"> 에서 읽는다.
     file:// 로 열어도 동작해야 하므로 fetch 를 쓰지 않는다.
     ----------------------------------------------------------- */
  function initModal() {
    var modal = document.querySelector('[data-modal-root]');
    var store = document.getElementById('modal-data');
    if (!modal || !store) return;

    var data;
    try { data = JSON.parse(store.textContent); } catch (e) { return; }

    var elVisual  = modal.querySelector('[data-modal-visual]');
    var elYear    = modal.querySelector('[data-modal-year]');
    var elTitle   = modal.querySelector('[data-modal-title]');
    var elCompany = modal.querySelector('[data-modal-company]');
    var elFacts   = modal.querySelector('[data-modal-facts]');
    var closeBtn  = modal.querySelector('[data-modal-close]');
    var lastFocus = null;

    function factRow(label, values) {
      if (!values || !values.length) return '';
      var dd = values.length > 1
        ? '<dd><span class="meta-line meta-line--tight">' +
            values.map(function (v) { return '<span>' + v + '</span>'; }).join('') +
          '</span></dd>'
        : '<dd>' + values[0] + '</dd>';
      return '<div class="modal__fact"><dt>' + label + '</dt>' + dd + '</div>';
    }

    function open(key, trigger) {
      var d = data[key];
      if (!d) return;
      lastFocus = trigger || document.activeElement;

      elVisual.innerHTML = '';
      if (d.image) {
        var im = new Image();
        im.alt = d.title.replace(/\n/g, ' ') + ' 상세 이미지';
        im.src = d.image;
        // WebP 를 못 읽는 브라우저는 PNG 로 되돌린다
        if (d.imagePng) im.onerror = function () { im.onerror = null; im.src = d.imagePng; };
        elVisual.appendChild(im);
      }
      elYear.textContent = d.year || '';
      elTitle.innerHTML = (d.title || '').split('\n').join('<br>');
      elCompany.textContent = d.company || '';
      elFacts.innerHTML =
        factRow('기간', d.period ? [d.period] : []) +
        factRow('참여도', d.roles) +
        factRow('사용 스킬', d.tools) +
        (d.url
          ? '<div class="modal__fact"><dt>사이트</dt><dd>' +
            '<a href="' + d.url + '" target="_blank" rel="noopener noreferrer">' + d.url + '</a></dd></div>'
          : '');

      modal.hidden = false;
      document.body.classList.add('is-modal-open');
      closeBtn.focus();
    }

    function close() {
      modal.hidden = true;
      document.body.classList.remove('is-modal-open');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    /* 프리로드 — 클릭 후 받기 시작하면 모달이 빈 채로 뜬다.
       (1) 카드에 마우스를 올리거나 포커스가 닿으면 그 한 장을 즉시 받고
       (2) 페이지가 한가할 때 나머지를 순서대로 받아둔다. */
    var warmed = {};
    function warm(key) {
      var d = data[key];
      if (!d || !d.image || warmed[key]) return;
      warmed[key] = true;
      var im = new Image();
      if (d.imagePng) im.onerror = function () { im.onerror = null; im.src = d.imagePng; };
      im.src = d.image;
    }

    ['pointerenter', 'focusin'].forEach(function (evt) {
      document.addEventListener(evt, function (e) {
        var t = e.target.closest ? e.target.closest('[data-modal-open]') : null;
        if (t) warm(t.getAttribute('data-modal-open'));
      }, true);
    });

    var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 300); };
    var queue = Object.keys(data);
    (function next() {
      if (!queue.length) return;
      warm(queue.shift());
      idle(next, { timeout: 2000 });
    })();

    // 카드 클릭 → 열기
    document.addEventListener('click', function (e) {
      var opener = e.target.closest ? e.target.closest('[data-modal-open]') : null;
      if (opener) {
        e.preventDefault();
        open(opener.getAttribute('data-modal-open'), opener);
        return;
      }
      if (!modal.hidden && e.target.closest('[data-modal-close], [data-modal-backdrop]')) close();
    });

    document.addEventListener('keydown', function (e) {
      if (modal.hidden) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      // 포커스를 모달 안에 가둔다
      var f = modal.querySelectorAll('a[href], button, [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* -----------------------------------------------------------
     Back to the Top
     ----------------------------------------------------------- */
  function initToTop() {
    var btn = document.querySelector('[data-to-top]');
    if (!btn) return;

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: reduceMotion ? 'auto' : 'smooth'
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initHeader();
    initNavToggle();
    initMarquee();
    initPixelSnap();
    initYearTabs();
    initModal();
    initToTop();
  });
})();
