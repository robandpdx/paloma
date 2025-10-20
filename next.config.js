/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_TARGET_ORGANIZATION: process.env.TARGET_ORGANIZATION,
    NEXT_PUBLIC_TARGET_DESCRIPTION: process.env.TARGET_DESCRIPTION,
    NEXT_PUBLIC_SOURCE_DESCRIPTION: process.env.SOURCE_DESCRIPTION,
    NEXT_PUBLIC_MODE: process.env.MODE,
  },
}

module.exports = nextConfig
