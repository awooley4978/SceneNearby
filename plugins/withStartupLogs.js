/**
 * TEMP DEBUG INSTRUMENT (debug/release-startup-logs only).
 *
 * Injects [SN] NSLog markers + a main-thread stack watchdog into the
 * generated Swift AppDelegate.swift so a release build's Console capture
 * bisects exactly where native startup stops:
 *   [SN] didFinishLaunching begin   — UIKit handed control to the app
 *   [SN] before startReactNative    — about to load the embedded JS bundle
 *   [SN] WATCHDOG +5s/+10s          — main-thread stack dump if still stuck
 *   [SN] after startReactNative     — host + bundle load completed
 *   [SN] embedded bundle ...        — URL + size of main.jsbundle (release)
 *
 * Rule: if any marker fails to inject, throw loudly — an uninstrumented
 * debug build is useless and would look like a false negative.
 */
const { withAppDelegate } = require('@expo/config-plugins');

module.exports = function withStartupLogs(config) {
  return withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      throw new Error(
        '[SN plugin] expected Swift AppDelegate, got ' + config.modResults.language
      );
    }

    let src = config.modResults.contents;

    if (src.includes('[SN]')) {
      return config; // already instrumented (idempotent)
    }

    // 1) didFinishLaunching marker — right after the method signature.
    const dlSig =
      '  ) -> Bool {\n    let delegate = ReactNativeDelegate()';
    if (!src.includes(dlSig)) {
      throw new Error('[SN plugin] could not find didFinishLaunching body (Swift)');
    }
    src = src.replace(
      dlSig,
      '  ) -> Bool {\n    NSLog("[SN] didFinishLaunching begin")\n    let delegate = ReactNativeDelegate()'
    );

    // 2) before startReactNative + watchdog stack dumps.
    const bindLine = '    bindReactNativeFactory(factory)';
    if (!src.includes(bindLine)) {
      throw new Error('[SN plugin] could not find bindReactNativeFactory (Swift)');
    }
    src = src.replace(
      bindLine,
      bindLine +
        '\n    NSLog("[SN] before startReactNative")\n' +
        '    DispatchQueue.global(qos: .utility).asyncAfter(deadline: .now() + 5) {\n' +
        '      NSLog("[SN] WATCHDOG +5s main thread stack:\\n%@", Thread.mainThread.callStackSymbols.joined(separator: "\\n"))\n' +
        '    }\n' +
        '    DispatchQueue.global(qos: .utility).asyncAfter(deadline: .now() + 10) {\n' +
        '      NSLog("[SN] WATCHDOG +10s main thread stack:\\n%@", Thread.mainThread.callStackSymbols.joined(separator: "\\n"))\n' +
        '    }'
    );

    // 3) after startReactNative — before the super call.
    const superCall =
      '    return super.application(application, didFinishLaunchingWithOptions: launchOptions)';
    if (!src.includes(superCall)) {
      throw new Error('[SN plugin] could not find super.application call (Swift)');
    }
    src = src.replace(
      superCall,
      '    NSLog("[SN] after startReactNative")\n' + superCall
    );

    // 4) embedded bundle logging in bundleURL() release branch.
    const bundleRet =
      '#else\n    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")\n#endif';
    if (!src.includes(bundleRet)) {
      throw new Error('[SN plugin] could not find bundleURL release branch (Swift)');
    }
    src = src.replace(
      bundleRet,
      '#else\n' +
        '    let snBundleUrl = Bundle.main.url(forResource: "main", withExtension: "jsbundle")\n' +
        '    if let snBundleUrl {\n' +
        '      let snSize = (try? FileManager.default.attributesOfItem(atPath: snBundleUrl.path))?[.size] as? NSNumber ?? 0\n' +
        '      NSLog("[SN] embedded bundle exists size=%@ path=%@", snSize, snBundleUrl.path)\n' +
        '      return snBundleUrl\n' +
        '    }\n' +
        '    NSLog("[SN] embedded bundle MISSING")\n' +
        '    return nil\n' +
        '#endif'
    );

    config.modResults.contents = src;
    return config;
  });
};
