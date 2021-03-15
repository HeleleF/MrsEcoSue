(() => {
  const ws = new WebSocket(location.origin.replace(/^http/, 'ws'));
  ws.binaryType = 'arraybuffer';

  const logger = document.querySelector('.logs');
  const input = document.querySelector('input');

  const loadBtn = document.getElementById('load-btn');
  const downloader = document.getElementById('dl-btn');

  let ourl = null;

  ws.addEventListener('message', ({ data }) => {
    if ('string' === typeof data) {
      const txt = document.createElement('p');
      txt.textContent = data;
      logger.appendChild(txt);
    } else if (data instanceof ArrayBuffer) {
      const blob = new Blob([data], { type: 'application/pdf' });
      ourl = URL.createObjectURL(blob);

      downloader.setAttribute('href', ourl);
      downloader.setAttribute('download', 'Sheet.pdf');

      downloader.classList.add('shown');
      loadBtn.removeAttribute('disabled');
    }
  });

  loadBtn.addEventListener('click', () => {
    const url = input.value.trim();
    if (!url) return;

    if (ourl) {
      downloader.removeAttribute('href');
      downloader.removeAttribute('download');

      URL.revokeObjectURL(ourl);
      ourl = null;
    }

    logger.innerHTML = '';
    downloader.classList.remove('shown');
    loadBtn.setAttribute('disabled', 'disabled');

    if (ws.readyState !== ws.OPEN) {
      alert('Disconnected, Reload the page to fix!');
      return;
    }

    ws.send(url);
  });
})();
