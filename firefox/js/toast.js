var CTP = CTP || {};

CTP.toast = {
  show(msg, isError) {
    if (!document.body) return;
    const el = document.getElementById('ctp-toast');
    if (el) el.remove();
    const d = document.createElement('div');
    d.id = 'ctp-toast';
    d.textContent = msg;
    Object.assign(d.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: '2147483647',
      background: isError ? '#dc2626' : '#1E3A5F',
      color: '#fff',
      font: '13px/1.4 -apple-system, BlinkMacSystemFont, sans-serif',
      padding: '8px 16px',
      borderRadius: '6px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
      opacity: '1',
      transition: 'opacity 0.3s',
    });
    document.body.appendChild(d);
    setTimeout(() => { d.style.opacity = '0'; setTimeout(() => d.remove(), 300); }, 2000);
  },
};
