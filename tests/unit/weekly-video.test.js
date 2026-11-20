import { describe, expect, it } from 'vitest';
import { latestPlaylistVideo } from '../../worker/weekly-video.js';

const entry = (id, date, title) => `<entry>
  <yt:videoId>${id}</yt:videoId>
  <published>${date}</published>
  <title>${title}</title>
</entry>`;
const feed = (...entries) => `<feed xmlns="http://www.w3.org/2005/Atom"
  xmlns:yt="http://www.youtube.com/xml/schemas/2015">${entries.join('')}</feed>`;

describe('the weekly video playlist', () => {
  it('uses the newest valid published video even if the playlist is reordered', () => {
    expect(latestPlaylistVideo(feed(
      entry('olderVideo1', '2026-11-06T22:00:00Z', 'Last week'),
      entry('bad/id', '2026-11-20T22:00:00Z', 'Invalid entry'),
      entry('P0oEK8HicGM', '2026-11-13T22:00:00Z', 'Weekly &amp; Church &#x2013; Groups'),
    ))).toEqual({ youtubeId: 'P0oEK8HicGM', title: 'Weekly & Church – Groups' });
  });

  it('leaves the bundled video in place for empty and malformed feeds', () => {
    expect(latestPlaylistVideo(feed())).toBeUndefined();
    expect(latestPlaylistVideo('<feed><entry>')).toBeUndefined();
  });
});
