import type { Site, SocialObjects } from "./types";

export const SITE: Site = {
  website: "https://dev.koke.me/", // replace this with your deployed domain
  author: "Jorge Bernal",
  profile: "https://koke.me/",
  desc: "Building on the web since 2003",
  title: "Koke",
  postPerIndex: 5,
  postPerPage: 10,
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
    name: "Tumblr",
    href: "https://koke.tumblr.com/",
    linkTitle: `${SITE.title} on Tumblr`,
    active: true,
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/jbernal/",
    linkTitle: `${SITE.title} on Instagram`,
    active: false,
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/in/jbernal/",
    linkTitle: `${SITE.title} on LinkedIn`,
    active: true,
  },
];
