const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const defaultConfig = getDefaultConfig(__dirname);
defaultConfig.cacheStores = [{ get: () => path.resolve(__dirname, '.metro-cache') }];
module.exports = defaultConfig;
