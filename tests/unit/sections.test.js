// Sections built from admin content stay sensible when that content is missing.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, test } from 'vitest';
import TeamMember from '../../src/components/content/TeamMember.astro';
import NetworkVideo from '../../src/components/section/NetworkVideo.astro';

let container;
beforeAll(async () => { container = await AstroContainer.create(); });

describe('TeamMember', () => {
  test('with no photo it shows the placeholder glyph, not a broken image', async () => {
    const html = await container.renderToString(TeamMember, { props: { name: 'Name Surname', role: 'Role' } });
    expect(html).toContain('class="glyph"');
    expect(html).not.toContain('<img');
    expect(html).toContain('Name Surname');
  });
});

describe('NetworkVideo', () => {
  const props = { heading: 'Network Video', eyebrow: 'Weekly', youtubeId: 'qo52gy0Gq74', title: 'This week' };

  test('renders the video box the page script plays', async () => {
    const html = await container.renderToString(NetworkVideo, { props });
    expect(html).toContain('id="network-video"');
    expect(html).toContain('data-youtube="qo52gy0Gq74"');
    expect(html).toContain('data-title="This week"');
  });

  test('render={false} leaves nothing', async () => {
    expect((await container.renderToString(NetworkVideo, { props: { ...props, render: false } })).trim()).toBe('');
  });

  test('a missing video id leaves nothing', async () => {
    expect((await container.renderToString(NetworkVideo, { props: { ...props, youtubeId: '' } })).trim()).toBe('');
  });
});
