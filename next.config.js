/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_TARGET_ORGANIZATION: process.env.NEXT_PUBLIC_TARGET_ORGANIZATION,
  },
}

module.exports = nextConfig
