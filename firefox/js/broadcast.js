var CTP = CTP || {};

CTP.broadcast = {
  _channel: new BroadcastChannel('copy-test-path'),

  copied(path) {
    this._channel.postMessage({ type: 'copied', path, format: CTP.settings.get('format'), ts: Date.now() });
  },
};
