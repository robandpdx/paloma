/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_TARGET_ORGANIZATION: process.env.TARGET_ORGANIZATION,
  },
}

module.exports = nextConfig
