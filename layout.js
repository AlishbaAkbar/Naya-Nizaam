(() => {
  const frame = document.querySelector('.device-frame, .frame');
  if (!frame) return;

  const mobileLayout = window.matchMedia('(max-width: 600px)');

  function fitAppFrame() {
    const scale = mobileLayout.matches
      ? 1
      : Math.min(
        1,
        (window.innerWidth - 24) / frame.offsetWidth,
        (window.innerHeight - 24) / frame.offsetHeight,
      );
    frame.style.setProperty('--device-scale', String(Math.max(0.5, scale)));
  }

  fitAppFrame();
  window.addEventListener('resize', fitAppFrame);
  mobileLayout.addEventListener('change', fitAppFrame);
})();
