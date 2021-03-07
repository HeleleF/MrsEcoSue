const ws = new WebSocket(location.origin.replace(/^http/, 'ws'));
ws.binaryType = 'arraybuffer';

const logger = document.querySelector('.logs');
const input = document.querySelector('input');
const iframe = document.querySelector('iframe');
let ourl;

iframe.addEventListener('load', console.log);

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
    iframe.src = ourl;
    return;
  }
};

document.querySelector('button').addEventListener('click', () => {
  if (ws.readyState !== ws.OPEN) {
    alert('Disconnected, Reload the page to fix!');
    return;
  }

  if (ourl) URL.revokeObjectURL(ourl);
  logger.innerHTML = '';
  ws.send(input.value.trim());
});
