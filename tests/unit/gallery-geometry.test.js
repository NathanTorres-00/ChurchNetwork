// Pure helpers of the Gallery engine: prefixed settings, the hero's quiet centre, and line colours.
import { describe, expect, test } from 'vitest';
import { prefixedConfig, quietFactor, clearOfQuiet, inHalo, aboveOrBelow, mixHex } from '../../assets/network-gallery.js';

const q = { cx: 500, cy: 300, rx: 200, ry: 100 };

describe('prefixedConfig', () => {
  test('reads and writes the prefixed key', () => {
    const cfg = { gallerySpin: 3, spin: 99 };
    const g = prefixedConfig(cfg, 'gallery');
    expect(g.spin).toBe(3);
    g.seed = 5;
    expect(cfg.gallerySeed).toBe(5);
    expect(g.missing).toBeUndefined();
  });
});

describe('quiet centre', () => {
  test('quietFactor is 0 everywhere inside, 1 beyond the soft band outside it, between in the band', () => {
    expect(quietFactor(500, 300, q, 0.35)).toBe(0);
    expect(quietFactor(500 + 200 * 0.6, 300, q, 0.35)).toBe(0);
    expect(quietFactor(500 + 200, 300, q, 0.35)).toBe(0);          // on the ellipse, where the text's corners sit
    expect(quietFactor(500, 300 - 100, q, 0.35)).toBe(0);
    expect(quietFactor(500 + 200 * 1.36, 300, q, 0.35)).toBe(1);
    const mid = quietFactor(500 + 200 * 1.17, 300, q, 0.35);
    expect(mid).toBeGreaterThan(0); expect(mid).toBeLessThan(1);
    expect(quietFactor(500, 300, null, 0.35)).toBe(1);
  });
  test('clearOfQuiet rejects any circle touching the ellipse', () => {
    expect(clearOfQuiet(500 + 200 + 30, 300, 40, q)).toBe(false);
    expect(clearOfQuiet(500 + 200 + 41, 300, 40, q)).toBe(true);
    expect(clearOfQuiet(500, 300 - 100 - 41, 40, q)).toBe(true);
    expect(clearOfQuiet(500, 300, 5, null)).toBe(true);
  });
  test('inHalo accepts only the ring just outside', () => {
    expect(inHalo(500 + 200 + 60, 300, 40, q, 260)).toBe(true);
    expect(inHalo(500 + 200 + 40 + 261 + 1, 300, 40, q, 260)).toBe(false);
    expect(inHalo(500, 300, 40, q, 260)).toBe(false);
  });
  test('aboveOrBelow allows only openings fully above or below', () => {
    expect(aboveOrBelow(300 - 100 - 40, 40, q)).toBe(true);
    expect(aboveOrBelow(300 + 100 + 40, 40, q)).toBe(true);
    expect(aboveOrBelow(300, 40, q)).toBe(false);
  });
});

test('mixHex blends two colours', () => {
  expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000');
  expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
  expect(mixHex('#2F7D6D', '#141414', 0.5)).toBe('#224941');   // Math.round per channel
});
