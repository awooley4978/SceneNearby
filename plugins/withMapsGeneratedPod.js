/**
 * Expo Config Plugin: withMapsGeneratedPod
 * 
 * Fixes two react-native-maps@1.22.0 issues under New Architecture on SDK 54:
 *
 * 1. Podspec resolution: Insert `react-native-maps-generated` pod with `:path`
 *    before `react-native-google-maps` so CocoaPods can resolve the dependency.
 *
 * 2. C++ modules for Google Maps: GoogleMaps / Google-Maps-iOS-Utils use `@import`
 *    in headers compiled as Objective-C++, which requires `-fcxx-modules`.
 *    Fix: Enable CLANG_ENABLE_MODULES + add -fcxx-modules in post_install.
 */
const { withPodfile } = require('expo/node_modules/@expo/config-plugins/build');

const GOOGLE_MAPS_MARKER = "pod 'react-native-google-maps', path:";

const POST_INSTALL_FIX = `  # Enable C++ modules for Google Maps pods (required for @import in .mm files)
    installer.pods_project.targets.each do |target|
      if ['GoogleMaps', 'Google-Maps-iOS-Utils', 'react-native-google-maps', 'react-native-maps-generated'].include?(target.name)
        target.build_configurations.each do |config|
          config.build_settings['CLANG_ENABLE_MODULES'] = 'YES'
          config.build_settings['OTHER_CFLAGS'] = '$(inherited) -fcxx-modules'
        end
      end
    end`;

function withMapsGeneratedPod(config) {
  return withPodfile(config, (podfileConfig) => {
    let contents = podfileConfig.modResults.contents;

    // Fix 1: Inject react-native-maps-generated pod before google-maps
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
        console.log('[withMapsGeneratedPod] ✓ Injected react-native-maps-generated pod');
      }
    }

    // Fix 2: Add Google Maps C++ modules fix inside post_install,
    // just before the closing `end` of the post_install block.
    if (!contents.includes("Enable C++ modules for Google Maps pods")) {
      // Find the post_install block's inner end (the `end` that closes
      // the block started by `post_install do |installer|`).
      // Strategy: find `post_install do |installer|`, then find the matching `end`
      // at the same indent level, and insert before it.
      const lines = contents.split('\n');
      let postInstallStart = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('post_install do |installer|')) {
          postInstallStart = i;
          break;
        }
      }
      if (postInstallStart >= 0) {
        const baseIndent = lines[postInstallStart].match(/^(\s*)/)[1];
        // Find the matching `end` at the same indent level
        for (let i = postInstallStart + 1; i < lines.length; i++) {
          if (lines[i].trim() === 'end' && lines[i].startsWith(baseIndent) && !lines[i].startsWith(baseIndent + ' ')) {
            // Insert fix before this closing end
            lines.splice(i, 0, POST_INSTALL_FIX);
            contents = lines.join('\n');
            console.log('[withMapsGeneratedPod] ✓ Added Google Maps C++ modules post_install fix');
            break;
          }
        }
      }
    }

    podfileConfig.modResults.contents = contents;
    return podfileConfig;
  });
}

module.exports = withMapsGeneratedPod;
