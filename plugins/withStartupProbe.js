/**
 * TEMP DEBUG INSTRUMENT (debug/release-startup-logs only).
 *
 * Drops an ObjC probe file (SNStartupProbe.m) into the app target and
 * registers it in the Xcode project. The probe logs at the earliest
 * possible points in the launch path — BEFORE main():
 *   [SN] constructor ran (dyld load complete, before main)
 *   [SN] +load ran (ObjC runtime, before main)
 *   [SN] category +load on NSObject ran (pre-main)
 *
 * Three independent canaries, strip-proofed:
 *  - constructor: __attribute__((used)) + keep-alive global + forced via
 *    `-u _SNProbeConstructor` linker flag
 *  - class +load: ObjC class metadata survives dead-stripping
 *  - category +load on NSObject: __objc_catlist is never dead-stripped
 *
 * Plus OTHER_LDFLAGS `-Wl,-no_dead_strip_inits_and_terms` on the Release
 * config so init functions are never stripped in the shipping binary.
 *
 * Combined with the AppDelegate [SN] markers from withStartupLogs, the
 * full bisection:
 *   no probe logs at all     → hang before main (dylib/static init)
 *   probe logs, no [SN] DFL  → hang between pre-main and didFinishLaunching
 *   DFL begin, no "after"    → hang inside startReactNative (bundle load)
 */
const fs = require('fs');
const path = require('path');
const { withXcodeProject } = require('@expo/config-plugins');

const PROBE = `#import <Foundation/Foundation.h>

// ---- Pre-main probe 1: C constructor --------------------------------------
// Non-static + used so the linker cannot dead-strip it; also kept via the
// -u _SNProbeConstructor linker flag and the keep-alive reference below.
__attribute__((used, constructor))
void SNProbeConstructor(void) {
  NSLog(@"[SN] constructor ran (dyld load complete, before main)");
}

// Keep-alive: a used global that references the constructor.
__attribute__((used))
static void *const SNProbeKeepAlive = (void *)&SNProbeConstructor;

// ---- Pre-main probe 2: ObjC class +load -----------------------------------
@interface SNStartupProbe : NSObject
@end

@implementation SNStartupProbe
+ (void)load {
  NSLog(@"[SN] +load ran (ObjC runtime, before main)");
}
@end

// ---- Pre-main probe 3: category +load on NSObject --------------------------
// ObjC category metadata (__objc_catlist) is never dead-stripped, so this is
// the most robust pre-main canary.
@interface NSObject (SNStartupProbe)
@end

@implementation NSObject (SNStartupProbe)
+ (void)load {
  NSLog(@"[SN] category +load on NSObject ran (pre-main)");
}
@end
`;

module.exports = function withStartupProbe(config) {
  return withXcodeProject(config, (config) => {
    const proj = config.modResults;
    const platformProjectRoot = config.modRequest.platformProjectRoot;

    // Find the app target dir (the sibling of the .xcodeproj).
    const entries = fs.readdirSync(platformProjectRoot, { withFileTypes: true });
    const appDir = entries.find(
      (e) => e.isDirectory() && !e.name.endsWith('.xcodeproj') && !e.name.startsWith('.')
    );
    if (!appDir) {
      throw new Error('[SN probe] could not locate app target dir under ' + platformProjectRoot);
    }

    const probePath = path.join(platformProjectRoot, appDir.name, 'SNStartupProbe.m');
    fs.writeFileSync(probePath, PROBE, 'utf8');

    // Register in the Xcode project's Compile Sources under the app group.
    const firstTarget = proj.getFirstTarget();
    if (!firstTarget || !firstTarget.firstTarget || !firstTarget.firstTarget.name) {
      throw new Error('[SN probe] could not determine first Xcode target');
    }
    const targetName = firstTarget.firstTarget.name;

    // addFile expects the group's UUID key, not its name — find it.
    const groups = proj.hash.project.objects['PBXGroup'];
    let groupKey = null;
    for (const key of Object.keys(groups)) {
      if (key.endsWith('_comment')) continue;
      if (groups[key] && groups[key].name === appDir.name) {
        groupKey = key;
        break;
      }
    }
    if (!groupKey) {
      throw new Error('[SN probe] could not find PBXGroup named ' + appDir.name);
    }

    // addToPbxSourcesBuildPhase resolves file.target as a PBXNativeTarget
    // UUID key (buildPhase does nativeTargets[target]) — resolve it.
    const targets = proj.hash.project.objects['PBXNativeTarget'];
    let targetKey = null;
    for (const key of Object.keys(targets)) {
      if (key.endsWith('_comment')) continue;
      if (targets[key] && targets[key].name === targetName) {
        targetKey = key;
        break;
      }
    }
    if (!targetKey) {
      throw new Error('[SN probe] could not find PBXNativeTarget named ' + targetName);
    }

    proj.addSourceFile(
      path.join(appDir.name, 'SNStartupProbe.m'),
      { target: targetKey },
      groupKey
    );

    // Strip-proof the probes: keep init functions in the Release binary and
    // force-keep the constructor symbol. (Release config only — dev untouched.)
    // NOTE: -Xlinker form only — the pbxproj serializer splits on commas, so
    // -Wl,-foo would be mangled into two tokens. Must keep $(inherited) so the
    // Pods xcconfig OTHER_LDFLAGS (-ObjC etc.) still apply.
    proj.updateBuildProperty(
      'OTHER_LDFLAGS',
      [
        '"$(inherited)"',
        '-Xlinker',
        '-no_dead_strip_inits_and_terms',
        '-Xlinker',
        '-u',
        '-Xlinker',
        '_SNProbeConstructor',
      ],
      'Release',
      targetName
    );

    return config;
  });
};
