#!/usr/bin/env python3
"""Additive-bisection branch generator for the SceneNearby pre-main hang.
Usage: python3 gen_branch.py <branch> <dep1> <dep2> ...  (each dep as name@version, or name:version)
Special dep tokens: +plugin:expo-dev-client, +plugin:expo-location, +plugin:expo-splash-screen, +babel:worklets
Applies edits to package.json / app.json / babel.config.js in the CWD."""
import json, shutil, subprocess, sys

BRANCH = sys.argv[1]
deps = {}
plugins = []
babel_worklets = False

for tok in sys.argv[2:]:
    if tok == "+plugin:expo-dev-client":
        plugins.append("expo-dev-client")
    elif tok == "+plugin:expo-splash-screen":
        plugins.append("expo-splash-screen")
    elif tok == "+plugin:expo-location":
        plugins.append(["expo-location", {
            "locationAlwaysAndWhenInUsePermission": "Scene Nearby uses your location to alert you when you're near a filming location.",
            "locationWhenInUsePermission": "Scene Nearby uses your location to show you nearby filming locations."
        }])
    elif tok == "+babel:worklets":
        babel_worklets = True
    else:
        name, _, ver = tok.partition("@")
        if name and ver:
            deps[name] = ver
        else:
            raise SystemExit(f"bad dep token: {tok}")

# --- package.json ---
with open("package.json") as f:
    pkg = json.load(f)
pkg["name"] = "scene-nearby-" + BRANCH.split("/")[-1]
pkg.get("dependencies", {}).update(deps)
with open("package.json", "w") as f:
    json.dump(pkg, f, indent=2)
    f.write("\n")

# --- app.json plugins ---
with open("app.json") as f:
    app = json.load(f)
if plugins:
    app["expo"]["plugins"] = plugins
with open("app.json", "w") as f:
    json.dump(app, f, indent=4)
    f.write("\n")

# --- babel.config.js ---
if babel_worklets:
    with open("babel.config.js", "w") as f:
        f.write("""module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-worklets/plugin'],
  };
};
""")

print(f"[{BRANCH}] deps={deps} plugins={plugins} babel_worklets={babel_worklets}")
