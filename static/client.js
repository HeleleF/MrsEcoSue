const ws = new WebSocket(location.origin.replace(/^http/, 'ws'));
ws.binaryType = 'arraybuffer';

const logger = document.querySelector('.logs');
const input = document.querySelector('input');

const loadBtn = document.getElementById('load-btn');
const downloader = document.getElementById('dl-btn');
const previewer = document.getElementById('preview-btn');

const actions = document.querySelector('.actions');

let ourl = null;

ws.onmessage = ({ data }) => {
  if ('string' === typeof data) {
    const txt = document.createElement('p');
    txt.textContent = data;
    logger.appendChild(txt);
    return;
  }

  if (data instanceof ArrayBuffer) {
    const blob = new Blob([data], { type: 'application/pdf' });
    ourl = URL.createObjectURL(blob);

    downloader.setAttribute('href', ourl);
    downloader.setAttribute('download', 'Sheet.pdf');

    previewer.setAttribute('href', ourl);

    actions.classList.add('shown');
    return;
  }
};

loadBtn.addEventListener('click', () => {
  if (ws.readyState !== ws.OPEN) {
    alert('Disconnected, Reload the page to fix!');
    return;
  }
  const url = input.value.trim();
  if (!url) return;

  if (ourl) {
    downloader.removeAttribute('href');
    downloader.removeAttribute('download');

    previewer.removeAttribute('href');

    URL.revokeObjectURL(ourl);
    ourl = null;
  }
  logger.innerHTML = '';
  actions.classList.remove('shown');
  ws.send(url);
});
