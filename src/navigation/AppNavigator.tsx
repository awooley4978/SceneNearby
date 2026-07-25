import React, { useRef, useCallback } from 'react';
import { Animated, Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { theme } from '../theme';
import { SavedProvider } from '../context/SavedContext';

import { NearbyMapScreen } from '../screens/NearbyMap/NearbyMapScreen';
import { DiscoverScreen } from '../screens/Discover/DiscoverScreen';
import { SavedScreen } from '../screens/Saved/SavedScreen';
import { ProfileScreen } from '../screens/Profile/ProfileScreen';
import { NotificationPreferencesScreen } from '../screens/Profile/NotificationPreferencesScreen';
import { LocationDetailScreen } from '../screens/LocationDetail/LocationDetailScreen';
import { MovieDetailScreen } from '../screens/MovieDetail/MovieDetailScreen';
import { FilmographyScreen } from '../screens/MovieDetail/FilmographyScreen';
import { PhotoGalleryScreen } from '../screens/PhotoGallery/PhotoGalleryScreen';
import { ActorDetailScreen } from '../screens/Discover/ActorDetailScreen';
import { AlbumScreen } from '../screens/Album/AlbumScreen';
import { LocationAlbumScreen } from '../screens/Album/LocationAlbumScreen';
import { AuthScreen } from '../screens/Auth/AuthScreen';
import { UploadPhotoScreen } from '../screens/Upload/UploadPhotoScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Screen transition animation ──
const cardStyleInterpolator = ({
  current: { progress: currentProgress },
  layouts: { screen },
}: any) => {
  const translateX = currentProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [screen.width * 0.08, 0],
  });
  const opacity = currentProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.5, 1],
  });
  return {
    cardStyle: {
      transform: [{ translateX }],
      opacity,
    },
  };
};

const modalInterpolator = ({
  current: { progress: currentProgress },
  layouts: { screen },
}: any) => {
  const scale = currentProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });
  const opacity = currentProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  return {
    cardStyle: {
      transform: [{ scale }],
      opacity,
    },
  };
};

const stackOptions: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: theme.colors.background },
  headerTintColor: theme.colors.textPrimary,
  headerTitleStyle: { fontWeight: '700' as const },
  animation: 'slide_from_right' as any,
};

const sharedScreens = (
  <>
    <Stack.Screen
      name="LocationDetail"
      component={LocationDetailScreen}
      options={{ title: 'Details', ...stackOptions, cardStyleInterpolator } as any}
    />
    <Stack.Screen
      name="MovieDetail"
      component={MovieDetailScreen}
      options={{ title: 'Film & TV', ...stackOptions, cardStyleInterpolator } as any}
    />
    <Stack.Screen
      name="Filmography"
      component={FilmographyScreen}
      options={{ title: 'Filmography', ...stackOptions, cardStyleInterpolator } as any}
    />
    <Stack.Screen
      name="PhotoGallery"
      component={PhotoGalleryScreen}
      options={{ title: 'Photos', ...stackOptions, cardStyleInterpolator } as any}
    />
    <Stack.Screen
      name="ActorDetail"
      component={ActorDetailScreen}
      options={{ title: 'Actor', ...stackOptions, cardStyleInterpolator } as any}
    />
    <Stack.Screen
      name="Upload"
      component={UploadPhotoScreen}
      options={{ title: 'Upload Photo', headerShown: false, animation: 'fade' as any, presentation: 'modal' as any }}
    />
  </>
);

function DiscoverStack() {
  return (
    <Stack.Navigator screenOptions={{ ...stackOptions, cardStyleInterpolator } as any}>
      <Stack.Screen name="DiscoverList" component={DiscoverScreen} options={{ title: 'Discover' }} />
      {sharedScreens}
    </Stack.Navigator>
  );
}

function SavedStack() {
  return (
    <Stack.Navigator screenOptions={{ ...stackOptions, cardStyleInterpolator } as any}>
      <Stack.Screen name="SavedList" component={SavedScreen} options={{ title: 'Saved' }} />
      {sharedScreens}
    </Stack.Navigator>
  );
}

function NearbyStack() {
  return (
    <Stack.Navigator screenOptions={{ ...stackOptions, cardStyleInterpolator, headerShown: false } as any}>
      <Stack.Screen name="NearbyMap" component={NearbyMapScreen} options={{ headerShown: false }} />
      {sharedScreens}
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ ...stackOptions, cardStyleInterpolator } as any}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} options={{ title: 'Profile', headerShown: false }} />
      <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="Album" component={AlbumScreen} options={{ title: 'Album' }} />
      <Stack.Screen name="LocationAlbum" component={LocationAlbumScreen} options={{ title: 'Photos' }} />
      <Stack.Screen name="Auth" component={AuthScreen} options={{ title: 'Sign In', headerShown: false, animation: 'fade' as any, presentation: 'modal' as any }} />
    </Stack.Navigator>
  );
}

// ── Tab icons data ──
const TABS = [
  { name: 'Nearby', icon: '🗺️', label: 'Nearby' },
  { name: 'Discover', icon: '🔍', label: 'Discover' },
  { name: 'Saved', icon: '💾', label: 'Saved' },
  { name: 'Profile', icon: '👤', label: 'Profile' },
];

// ── Custom Tab Bar ──
const CustomTabBar: React.FC<{
  state: any;
  descriptors: any;
  navigation: any;
}> = ({ state, descriptors, navigation }) => {
  const scaleAnims = useRef(TABS.map(() => new Animated.Value(1))).current;
  const glowAnims = useRef(TABS.map(() => new Animated.Value(0))).current;

  const handleTabPress = useCallback(
    (routeName: string, index: number) => {
      // Bounce animation
      Animated.sequence([
        Animated.spring(scaleAnims[index], {
          toValue: 1.15,
          damping: 8,
          stiffness: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnims[index], {
          toValue: 1,
          damping: 12,
          stiffness: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Glow pulse
      Animated.sequence([
        Animated.timing(glowAnims[index], {
          toValue: 1,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnims[index], {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();

      // Haptic
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      const event = navigation.emit({
        type: 'tabPress',
        target: routeName,
        canPreventDefault: true,
      });

      if (!event.defaultPrevented) {
        navigation.navigate(routeName);
      }
    },
    [navigation, scaleAnims, glowAnims],
  );

  return (
    <View style={styles.tabBar}>
      {/* Active indicator — slides horizontally */}
      <Animated.View
        style={[
          styles.indicator,
          {
            transform: [
              {
                translateX: scaleAnims[0].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0], // will be overridden by state.index
                }),
              },
            ],
            left: `${(state.index + 0.5) * (100 / TABS.length)}%`,
            marginLeft: -(40 / 2),
          },
        ]}
      />

      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const icon = TABS[index]?.icon || '•';
        const label = TABS[index]?.label || options.tabBarLabel || route.name;

        return (
          <TouchableOpacity
            key={route.name}
            onPress={() => handleTabPress(route.name, index)}
            activeOpacity={1}
            style={styles.tabItem}
          >
            <View style={styles.tabIconContainer}>
              {/* Gold glow background */}
              {isFocused && (
                <Animated.View
                  style={[
                    styles.glowBg,
                    {
                      opacity: glowAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 0.6],
                      }),
                    },
                  ]}
                />
              )}
              {/* Icon with spring bounce */}
              <Animated.Text
                style={[
                  styles.tabIcon,
                  {
                    transform: [{ scale: isFocused ? scaleAnims[index] : 1 }],
                    opacity: isFocused ? 1 : 0.45,
                  },
                ]}
              >
                {icon}
              </Animated.Text>
            </View>
            <Animated.Text
              style={[
                styles.tabLabel,
                {
                  color: isFocused ? theme.colors.gold : theme.colors.textTertiary,
                  opacity: isFocused ? 1 : 0.6,
                  transform: [{ scale: isFocused ? scaleAnims[index] : 1 }],
                },
              ]}
            >
              {label}
            </Animated.Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export const AppNavigator: React.FC = () => {
  return (
    <SavedProvider>
    <NavigationContainer>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName="Discover"
      >
        <Tab.Screen name="Nearby" component={NearbyStack} />
        <Tab.Screen name="Discover" component={DiscoverStack} />
        <Tab.Screen name="Saved" component={SavedStack} />
        <Tab.Screen name="Profile" component={ProfileStack} />
      </Tab.Navigator>
    </NavigationContainer>
    </SavedProvider>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderTopColor: 'rgba(255,255,255,0.06)',
    borderTopWidth: 1,
    height: 85,
    paddingBottom: 25,
    paddingTop: 6,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: 40,
    height: 3,
    backgroundColor: theme.colors.gold,
    borderRadius: 2,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  tabIconContainer: {
    width: 40,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glowBg: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.gold,
  },
  tabIcon: {
    fontSize: 22,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});