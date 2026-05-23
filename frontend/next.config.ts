import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export so Cloudflare Pages can host the bare HTML/JS bundle.
  output: "export",
  // Pages can't run Next's image optimizer.
  images: { unoptimized: true },
  // Emit /foo/index.html instead of /foo.html — plays nicer with Cloudflare's
  // path resolution and the _redirects rules below.
  trailingSlash: true,
};

export default nextConfig;
