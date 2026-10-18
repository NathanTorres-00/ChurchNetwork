// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import { pickMimeType, startRecording } from '../../review/recorder.js';

const supports = (...types) => t => types.includes(t);

describe('recorder', () => {
  test('prefers mp4 when supported', () => {
    expect(pickMimeType(supports('audio/webm;codecs=opus', 'audio/mp4'))).toBe('audio/mp4');
  });

  test('falls back to webm opus', () => {
    expect(pickMimeType(supports('audio/webm;codecs=opus', 'audio/webm'))).toBe('audio/webm;codecs=opus');
  });

  test('returns empty string when nothing matches', () => {
    expect(pickMimeType(supports())).toBe('');
  });

  test('startRecording rejects UNSUPPORTED without MediaRecorder', async () => {
    expect(globalThis.MediaRecorder).toBeUndefined();
    await expect(startRecording({})).rejects.toMatchObject({ code: 'UNSUPPORTED' });
  });
});
