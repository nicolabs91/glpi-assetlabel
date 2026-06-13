(() => {
  const movePrintAction = () => {
    const action = document.querySelector('.assetlabel-header-action');
    const assetName = document.querySelector('#header-friendlyname');
    if (!action || !assetName || action.parentElement === assetName) {
      return;
    }

    assetName.append(action);
  };

  const initializeLivePreview = () => {
    const form = document.querySelector('#assetlabel-settings');
    const label = document.querySelector('.assetlabel-label');
    const pageSize = document.querySelector('#assetlabel-page-size');
    if (!form || !label || !pageSize || form.dataset.livePreview === 'ready') {
      return;
    }
    form.dataset.livePreview = 'ready';

    const presets = {
      '62x29': [62, 29],
      '50x25': [50, 25],
      '70x37': [70, 37],
    };
    const format = form.elements.namedItem('format');
    const width = form.elements.namedItem('width');
    const height = form.elements.namedItem('height');
    const qr = form.elements.namedItem('qr');

    const clamp = (value, minimum, maximum) => (
      Math.max(minimum, Math.min(maximum, Number(value) || minimum))
    );

    const syncUrl = () => {
      const query = new URLSearchParams(new FormData(form));
      query.set('submitted', '1');
      history.replaceState(null, '', `${location.pathname}?${query.toString()}`);
    };

    const update = () => {
      const labelWidth = clamp(width.value, 20, 150);
      const labelHeight = clamp(height.value, 10, 100);
      document.documentElement.style.setProperty('--assetlabel-width', `${labelWidth}mm`);
      document.documentElement.style.setProperty('--assetlabel-height', `${labelHeight}mm`);
      pageSize.textContent = `:root{--assetlabel-width:${labelWidth}mm;`
        + `--assetlabel-height:${labelHeight}mm}`
        + `@media print{@page{size:${labelWidth}mm ${labelHeight}mm;margin:0}}`;

      form.querySelectorAll('input[type="checkbox"][name]').forEach(input => {
        if (input.name === 'qr') {
          return;
        }
        document.querySelectorAll(`[data-assetlabel-field="${CSS.escape(input.name)}"]`)
          .forEach(element => element.classList.toggle('d-none', !input.checked));
      });

      document.querySelector('.assetlabel-qr')
        ?.classList.toggle('d-none', !qr.checked);
      const visibleFields = [...document.querySelectorAll('[data-assetlabel-field]')]
        .some(element => !element.classList.contains('d-none'));
      document.querySelector('.assetlabel-empty')
        ?.classList.toggle('d-none', visibleFields);
      syncUrl();
    };

    format.addEventListener('change', () => {
      if (presets[format.value]) {
        [width.value, height.value] = presets[format.value];
      }
      update();
    });
    [width, height].forEach(input => input.addEventListener('input', () => {
      format.value = 'custom';
      update();
    }));
    form.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.addEventListener('change', update);
    });
    update();
  };

  const start = () => {
    movePrintAction();
    initializeLivePreview();
    new MutationObserver(() => {
      movePrintAction();
      initializeLivePreview();
    }).observe(document.body, {
      childList: true,
      subtree: true,
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
