/** @type {import('next').NextConfig} */

/** Хости зображень скінів/кейсів (Steam CDN, gamecontent тощо). */
const remoteImageHosts = [
  "community.cloudflare.steamstatic.com",
  "community.fastly.steamstatic.com",
  "steamcommunity-a.akamaihd.net",
  "steamcdn-a.akamaihd.net",
  "cdn.akamai.steamstatic.com",
  "store.akamai.steamstatic.com",
  "steamuserimages-a.akamaihd.net",
  "avatars.akamai.steamstatic.com",
  "avatars.fastly.steamstatic.com",
  "avatars.steamstatic.com",
  "cdn.gamecontent.io",
];

const nextConfig = {
  images: {
    remotePatterns: remoteImageHosts.flatMap((hostname) => [
      { protocol: "https", hostname, pathname: "/**" },
      { protocol: "http", hostname, pathname: "/**" },
    ]),
  },
};

export default nextConfig;
