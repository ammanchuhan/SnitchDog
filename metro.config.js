const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// The server is a separate Next.js app living in the same repo; Metro should not watch it.
config.resolver.blockList = [/.*\/server\/.*/];

module.exports = config;
