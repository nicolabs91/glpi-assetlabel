(() => {
  const movePrintAction = () => {
    const action = document.querySelector('.assetlabel-header-action');
    const assetName = document.querySelector('#header-friendlyname');
    if (!action || !assetName || action.parentElement === assetName) {
      return;
    }

    assetName.append(action);
  };

  const start = () => {
    movePrintAction();
    new MutationObserver(movePrintAction).observe(document.body, {
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
