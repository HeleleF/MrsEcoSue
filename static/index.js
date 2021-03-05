const HOST = location.origin.replace(/^http/, 'ws');
const ws = new WebSocket(HOST);
const result = document.querySelector('.wss');

ws.onmessage = (event) => {
  result.textContent = 'Server time: ' + event.data;
};

document.querySelector('button').addEventListener('click', async () => {
    alert('clicked!');
});