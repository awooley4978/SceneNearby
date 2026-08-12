// Diagnostic entry: captures the first fatal error (module-scope throw or
// runtime uncaught) and renders it full-screen in Release, so we can see
// the exact message/stack on-device without a Mac/console.
import { registerRootComponent } from 'expo';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

globalThis.__fatalError = null;

const origHandler = globalThis.ErrorUtils?.getGlobalHandler?.();
if (globalThis.ErrorUtils?.setGlobalHandler) {
  globalThis.ErrorUtils.setGlobalHandler((e, isFatal) => {
    globalThis.__fatalError = e;
    try { console.error('[CAPTURED]', e && e.message, e && e.stack); } catch (_) {}
    // keep original behavior so the app still aborts; we only recorded it
    if (origHandler) origHandler(e, isFatal);
  });
}

let AppComponent = null;
try {
  AppComponent = require('./App').default;
} catch (e) {
  globalThis.__fatalError = e;
  try { console.error('[CAPTURE] module-scope throw:', e && e.message, e && e.stack); } catch (_) {}
}

function Root() {
  if (globalThis.__fatalError) {
    const e = globalThis.__fatalError;
    const msg = (e && (e.message || String(e))) || 'Unknown error';
    const stack = (e && e.stack) || '';
    return (
      <View style={styles.box}>
        <Text style={styles.title}>FATAL CAPTURED</Text>
        <Text style={styles.msg}>{String(msg)}</Text>
        <Text style={styles.stack}>{String(stack)}</Text>
      </View>
    );
  }
  return AppComponent ? <AppComponent /> : null;
}

registerRootComponent(Root);

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', padding: 16 },
  title: { color: '#ff3333', fontSize: 16, fontWeight: '800', marginBottom: 12 },
  msg: { color: '#ffffff', fontSize: 13, marginBottom: 12 },
  stack: { color: '#cccccc', fontSize: 10 },
});
