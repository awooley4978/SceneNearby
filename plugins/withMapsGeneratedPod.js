/**
 * Expo Config Plugin: withMapsGeneratedPod
 * 
 * Fixes CocoaPods resolution for react-native-maps@1.22.0 under New Architecture.
 * 
 * The prebuild-generated Podfile adds `react-native-google-maps` before
 * `use_native_modules!`, but google-maps depends on `react-native-maps-generated`.
 * CocoaPods can't find the generated podspec because no `:path` has been registered
 * for it yet, and it doesn't exist in the spec repos.
 * 
 * This plugin adds `pod 'react-native-maps-generated'` with the same `:path`
 * immediately before the google-maps pod, so CocoaPods resolves correctly.
 * 
 * NOTE: Must import from Expo's bundled @expo/config-plugins, NOT from the
 * one in react-native-maps/node_modules (which lacks withPodfile).
 */
const { withPodfile } = require('expo/node_modules/@expo/config-plugins/build');

const GOOGLE_MAPS_MARKER = "pod 'react-native-google-maps', path:";

function withMapsGeneratedPod(config) {
  return withPodfile(config, (podfileConfig) => {
    let contents = podfileConfig.modResults.contents;

    if (contents.includes(GOOGLE_MAPS_MARKER) && !contents.includes("pod 'react-native-maps-generated'")) {
      const lines = contents.split('\n');
      const insertionIndex = lines.findIndex((line) => line.includes(GOOGLE_MAPS_MARKER));

      if (insertionIndex >= 0) {
        const generatedLine = lines[insertionIndex].replace(
          'react-native-google-maps',
          'react-native-maps-generated'
        );
        lines.splice(insertionIndex, 0, generatedLine);
        contents = lines.join('\n');
        podfileConfig.modResults.contents = contents;
        console.log('[withMapsGeneratedPod] ✓ Injected react-native-maps-generated pod');
      }
    }

    return podfileConfig;
  });
}

module.exports = withMapsGeneratedPod;
