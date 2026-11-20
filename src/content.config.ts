// Content an admin edits: the weekly video, the leaders, group stories, page copy and the footer.
// Each collection is read from local JSON for now; a later project swaps the loaders for Sanity and keeps these shapes.
import { defineCollection, reference } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const one = (file: string, id: string) =>
  glob({ pattern: file, base: "./src/content", generateId: () => id });

const button = z.object({
  label: z.string(),
  href: z.string(),
  /** A link with nowhere to go yet: shown, but it does not navigate. */
  placeholder: z.boolean().default(false),
});

const weeklyVideo = defineCollection({
  loader: one("weekly-video.json", "current"),
  schema: z.object({
    youtubeId: z.string().min(1),
    title: z.string(),
  }),
});

/** The network's leaders, one entry each (the file name is the id the pages list them by). */
const leaders = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/leaders" }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      photo: image().optional(),
    }),
});

const groupStories = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/group-stories" }),
  schema: ({ image }) =>
    z.object({
      quote: z.string(),
      name: z.string().optional(),
      attribution: z.string(),
      photo: z.union([z.string().startsWith("/assets/"), image()]).optional(),
      photoAlt: z.string().optional(),
    }),
});

const homePage = defineCollection({
  loader: one("pages/home.json", "home"),
  schema: ({ image }) =>
    z.object({
      top: z.object({
        lead: z.string(),
        title: z.object({
          label: z.string(),
          prefix: z.string(),
          words: z.array(z.string()).length(4),
        }),
        tagline: z.string(),
        body: z.string(),
        buttons: z.array(button),
      }),
      churchNetwork: z.object({
        eyebrow: z.string(),
        videoTitle: z.string(),
      }),
      whatWeDo: z.object({
        heading: z.string(),
        subtitle: z.string(),
        lead: z.string(),
        photo: z.object({ src: image(), alt: z.string() }),
        stats: z.array(z.object({ value: z.string(), label: z.string() })).length(4),
      }),
      how: z.object({
        heading: z.string(),
        lead: z.string(),
        items: z.array(
          z.object({
            heading: z.string(),
            body: z.string(),
            /** Photo shown on hover: a file under assets/ (as `assets/network-photos/…`), or an Unsplash photo id. */
            photo: z.string(),
            button,
          }),
        ),
      }),
      app: z.object({
        logo: z.object({ src: image(), alt: z.string() }),
        heading: z.string(),
        /** Bold line under the heading ("Are you a Pastor?"). */
        subtitle: z.string().optional(),
        lead: z.string(),
        /** Where the lead line links to, if anywhere. */
        leadHref: z.string().optional(),
        university: z.object({
          heading: z.string(),
          body: z.string(),
          photo: image(),
          button,
        }),
      }),
      hubs: z.object({
        heading: z.string(),
        lead: z.string(),
      }),
      story: z.object({
        heading: z.string(),
        subheading: z.string().optional(),
        items: z.array(z.object({ when: z.string(), heading: z.string(), body: z.string() })),
      }),
    }),
});

const groupsPage = defineCollection({
  loader: one("pages/groups.json", "groups"),
  schema: ({ image }) => z.object({
    top: z.object({
      heading: z.string(),
      tagline: z.string(),
      photo: z.object({ src: image(), alt: z.string() }),
      buttons: z.array(button),
    }),
    what: z.object({
      eyebrow: z.string(),
      heading: z.string(),
      lead: z.string(),
      items: z.array(
        z.object({
          heading: z.string(),
          intro: z.string(),
          traits: z.array(z.string()),
          button,
        }),
      ),
      already: z.object({ body: z.string(), button }),
    }),
    video: z.object({
      eyebrow: z.string(),
      heading: z.string(),
      playLabel: z.string(),
    }),
    team: z.object({
      eyebrow: z.string(),
      heading: z.string(),
      lead: z.string(),
      /** Leaders shown on Groups, in order, each with their role on the team. */
      people: z.array(z.object({ leader: reference("leaders"), role: z.string().optional() })),
      button: button.optional(),
    }),
  }),
});

const leadershipPage = defineCollection({
  loader: one("pages/leadership.json", "leadership"),
  schema: ({ image }) =>
    z.object({
      top: z.object({
        heading: z.string(),
        lead: z.string(),
        /** Links to the page's own sections, under the lead. */
        directory: z.array(z.object({ label: z.string(), href: z.string() })),
        /** Label under the orbit. */
        key: z.string(),
      }),
      team: z.object({
        heading: z.string(),
        body: z.array(z.string()),
        people: z.array(z.object({ leader: reference("leaders"), role: z.string().optional() })),
        photo: image(),
        photoAlt: z.string(),
        caption: z.string().optional(),
      }),
      overseers: z.object({
        heading: z.string(),
        groups: z.array(
          z.object({
            id: z.string().optional(),
            heading: z.string(),
            assignments: z.array(z.object({ heading: z.string(), people: z.array(reference("leaders")) })),
          }),
        ),
      }),
      /** The Rock Leaders roster; hidden while `show` is false (main 77af76e). */
      network: z.object({ show: z.boolean(), heading: z.string(), people: z.array(reference("leaders")) }),
      join: z.object({
        heading: z.string(),
        lead: z.string(),
        button,
      }),
    }),
});

/** The site's videos, one entry each (the file name is the id). Played on Vimeo; the poster is the tall artwork. */
const videos = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/videos" }),
  schema: z.object({
    title: z.string(),
    vimeoId: z.string(),
    /** Tall poster (7:10) in public/, e.g. /assets/videos/… */
    poster: z.string(),
    /** Length in seconds. */
    duration: z.number().int().positive(),
    /** One or two sentences about the video, shown in the Videos page's hero when it's featured. */
    description: z.string().optional(),
  }),
});

/** The Videos page: which videos the hero features, and the rows, in order. Home's Jesus Disciple rows use the same series. */
const videosPage = defineCollection({
  loader: one("pages/videos.json", "videos"),
  schema: z.object({
    heading: z.string(),
    featured: z.array(reference("videos")).min(1),
    series: z.array(
      z.object({
        id: z.string(),
        heading: z.string(),
        /** How a video in this series is named to screen readers, before its title ("Vision video: Think Small"). */
        label: z.string(),
        videos: z.array(reference("videos")).min(1),
      }),
    ),
  }),
});

const footer = defineCollection({
  loader: one("footer.json", "footer"),
  schema: z.object({
    tagline: z.string(),
    social: z.array(z.object({ label: z.string(), href: z.string(), placeholder: z.boolean().default(false) })),
    newsletter: z.object({
      label: z.string(),
      placeholder: z.string(),
      button: z.string(),
      notice: z.string(),
    }),
    columns: z.array(
      z.object({
        label: z.string(),
        links: z.array(z.object({ label: z.string(), href: z.string(), placeholder: z.boolean().default(false) })),
      }),
    ),
    copyright: z.string(),
  }),
});

export const collections = { weeklyVideo, leaders, groupStories, homePage, groupsPage, leadershipPage, videos, videosPage, footer };
