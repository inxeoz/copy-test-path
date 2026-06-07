let port = null;
let active = false;
let currentPath = '';

const overlay = document.getElementById('overlay');
const ocean = document.getElementById('ocean');
const island = document.getElementById('island');
const pathDisplay = document.getElementById('path-display');
const copyBtn = document.getElementById('copyBtn');
const quitBtn = document.getElementById('quitBtn');

let throttleTimer = null;

function onMouseMove(e) {
  if (!active || !port) return;
  if (throttleTimer) return;
  throttleTimer = setTimeout(() => { throttleTimer = null; }, 30);
  port.postMessage({ what: 'highlight-at-point', mx: e.clientX, my: e.clientY });
}

function onClick(e) {
  if (!active || !port) return;
  port.postMessage({ what: 'element-at-point', mx: e.clientX, my: e.clientY });
}

function onCopy() {
  if (!port || !currentPath) return;
  port.postMessage({ what: 'copy-path', path: currentPath });
}

function onQuit() {
  if (!port) return;
  port.postMessage({ what: 'quit' });
}

window.addEventListener('message', ev => {
  if (ev.data.what !== 'pickerStart') return;
  port = ev.ports[0];
  port.onmessage = ev => {
    const msg = ev.data;
    switch (msg.what) {
      case 'setSettings':
        active = true;
        break;
      case 'show-highlight':
        currentPath = msg.path;
        pathDisplay.textContent = msg.path;
        ocean.setAttribute('d', `M0 0h${msg.vw}v${msg.vh}h-${msg.vw}z M${msg.left} ${msg.top}h${msg.width}v${msg.height}h-${msg.width}z`);
        island.setAttribute('d', `M${msg.left} ${msg.top}h${msg.width}v${msg.height}h-${msg.width}z`);
        break;
      case 'element-selected':
        currentPath = msg.path;
        pathDisplay.textContent = msg.path;
        break;
      case 'quit':
        window.close();
        break;
    }
  };
  port.postMessage({ what: 'ready' });
});

overlay.addEventListener('mousemove', onMouseMove);
overlay.addEventListener('click', onClick);
copyBtn.addEventListener('click', onCopy);
quitBtn.addEventListener('click', onQuit);
