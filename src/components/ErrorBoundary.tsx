import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../theme';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Global error boundary. Without one, a single screen crashing during render
 * unmounts the entire React tree and leaves a blank/black app. This catches
 * those crashes and shows the message instead — so a failure is always
 * visible and diagnosable, never a silent black screen.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <ScrollView style={styles.scroll}>
            <Text style={styles.message}>{String(this.state.error?.message || this.state.error)}</Text>
          </ScrollView>
          <Text style={styles.hint}>Restart the app to continue.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 12 },
  scroll: { maxHeight: 200, marginBottom: 12 },
  message: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center' },
  hint: { fontSize: 12, color: theme.colors.textTertiary },
});
