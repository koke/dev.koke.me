import type { Site, SocialObjects } from "./types";

export const SITE: Site = {
  website: "https://dev.koke.me/", // replace this with your deployed domain
  author: "Jorge Bernal",
  profile: "https://koke.me/",
  desc: "Building on the web since 2003",
  title: "Koke",
  lightAndDarkMode: true,
  postPerIndex: 4,
  postPerPage: 3,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
};

export const LOCALE = {
  lang: "en", // html lang code. Set this empty and default will be "en"
  langTag: ["en-EN"], // BCP 47 Language Tags. Set this empty [] to use the environment default
} as const;

export const SOCIALS: SocialObjects = [
  {
    name: "Github",
    href: "https://github.com/koke",
    linkTitle: ` ${SITE.title} on Github`,
    active: true,
  },
  {
    name: "Instagram",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Instagram`,
    active: true,
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/in/jbernal/",
    linkTitle: `${SITE.title} on LinkedIn`,
    active: true,
  },
];
