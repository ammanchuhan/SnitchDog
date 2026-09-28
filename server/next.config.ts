import type { NextConfig } from 'next';

/** Security headers on every response. The API is called by the app with a bearer token and has
 *  no CORS headers, so browsers on other sites can't call it with anyone's credentials. The few
 *  HTML pages (the site, privacy, terms) load nothing from elsewhere. */
const headers = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  {
    key: 'Content-Security-Policy',
    // Next inlines its bootstrap script and the pages use inline styles.
    value:
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  },
];

const config: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers }];
  },
};

export default config;
