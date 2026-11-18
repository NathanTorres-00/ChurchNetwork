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
      photo: image().optional(),
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
      /** Leaders shown on Groups, in order. */
      people: z.array(reference("leaders")),
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
        /** Labels of the two rings under the orbit. */
        key: z.object({ network: z.string(), group: z.string() }),
      }),
      network: z.object({ heading: z.string(), people: z.array(reference("leaders")) }),
      group: z.object({ heading: z.string(), people: z.array(reference("leaders")) }),
      join: z.object({
        heading: z.string(),
        lead: z.string(),
        photo: image(),
        photoAlt: z.string(),
        button,
      }),
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

export const collections = { weeklyVideo, leaders, groupStories, homePage, groupsPage, leadershipPage, footer };
