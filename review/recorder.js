// Records a voice memo from the mic. Browsers record different formats (iPhone Safari: MP4/AAC; Chrome and
// Firefox: WebM or Ogg Opus), so the format is chosen at run time, preferring MP4, which iPhones can play back.

const TYPES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm'];

export function pickMimeType(isSupported = t => !!globalThis.MediaRecorder?.isTypeSupported?.(t)) {
  return TYPES.find(t => isSupported(t)) || '';
}

const fail = (code, cause) => Object.assign(new Error(code), { code, cause });

export async function startRecording({ maxMs = 180000, onTick, onLimit } = {}) {
  if (!globalThis.MediaRecorder || !navigator.mediaDevices?.getUserMedia) throw fail('UNSUPPORTED');

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    throw fail(e?.name === 'NotAllowedError' || e?.name === 'SecurityError' ? 'MIC_DENIED' : 'UNSUPPORTED', e);
  }

  const mime = pickMimeType();
  let recorder;
  try {
    recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  } catch (e) {
    stream.getTracks().forEach(t => t.stop());           // never leave the mic open
    throw fail('UNSUPPORTED', e);
  }
  const chunks = [];
  let started = performance.now(), elapsed = 0, discarded = false;
  const release = () => { clearInterval(ticker); stream.getTracks().forEach(t => t.stop()); };

  const finished = new Promise(resolve => {
    recorder.addEventListener('dataavailable', e => { if (e.data?.size) chunks.push(e.data); });
    recorder.addEventListener('stop', () => {
      release();
      const type = recorder.mimeType || mime || 'audio/webm';
      resolve(discarded ? null : { blob: new Blob(chunks, { type }), mime: type, durationMs: Math.min(maxMs, Math.round(elapsed)) });
    });
  });

  const ticker = setInterval(() => {
    elapsed = performance.now() - started;
    onTick?.(Math.min(maxMs, elapsed));
    if (elapsed >= maxMs && recorder.state === 'recording') { recorder.stop(); onLimit?.(); }
  }, 250);

  try {
    recorder.start(250);
  } catch (e) {
    release();
    throw fail('UNSUPPORTED', e);
  }
  started = performance.now();

  return {
    stop() {
      if (recorder.state === 'recording') { elapsed = performance.now() - started; recorder.stop(); }
      return finished;
    },
    cancel() {
      discarded = true;
      if (recorder.state !== 'inactive') recorder.stop(); else release();
    },
  };
}
