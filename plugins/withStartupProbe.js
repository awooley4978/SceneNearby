/**
 * TEMP DEBUG INSTRUMENT (debug/release-startup-logs only).
 *
 * Drops an ObjC probe file (SNStartupProbe.m) into the app target and
 * registers it in the Xcode project. The probe logs at the two earliest
 * possible points in the launch path:
 *   [SN] +load ran                    — ObjC runtime load (before main)
 *   [SN] constructor ran (dyld done)  — C constructor (before main)
 *
 * Combined with the AppDelegate [SN] markers from withStartupLogs, the
 * full bisection becomes:
 *   no probe logs          → hang inside dyld / a library's own static init
 *   probe logs, no [SN] DFL→ hang between pre-main and didFinishLaunching
 *   DFL begin, no "after"  → hang inside startReactNative (bundle load)
 */
const fs = require('fs');
const path = require('path');
const { withXcodeProject } = require('@expo/config-plugins');

const PROBE = `#import <Foundation/Foundation.h>

__attribute__((constructor))
static void SNProbeConstructor(void) {
  NSLog(@"[SN] constructor ran (dyld load complete, before main)");
}

@interface SNStartupProbe : NSObject
@end

@implementation SNStartupProbe
+ (void)load {
  NSLog(@"[SN] +load ran (ObjC runtime, before main)");
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

    return config;
  });
};
