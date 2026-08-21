import React, { useRef, useCallback, Fragment } from 'react';
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
import { ContributeScreen } from '../screens/Contribute/ContributeScreen';
import { AdminDashboardScreen } from '../screens/Admin/AdminDashboardScreen';
import { AdminDetailScreen } from '../screens/Admin/AdminDetailScreen';
import { AdminResearchScreen } from '../screens/Admin/AdminResearchScreen';

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
      options={{ headerShown: false, ...stackOptions, cardStyleInterpolator } as any}
    />
    <Stack.Screen
      name="MovieDetail"
      component={MovieDetailScreen}
      options={{ headerShown: false, ...stackOptions, cardStyleInterpolator } as any}
    />
    <Stack.Screen
      name="Filmography"
      component={FilmographyScreen}
      options={{ headerShown: false, ...stackOptions, cardStyleInterpolator } as any}
    />
    <Stack.Screen
      name="PhotoGallery"
      component={PhotoGalleryScreen}
      options={{ headerShown: false, ...stackOptions, cardStyleInterpolator } as any}
    />
    <Stack.Screen
      name="ActorDetail"
      component={ActorDetailScreen}
      options={{ headerShown: false, ...stackOptions, cardStyleInterpolator } as any}
    />
    <Stack.Screen
      name="Upload"
      component={UploadPhotoScreen}
      options={{ title: 'Upload Photo', headerShown: false, animation: 'fade' as any, presentation: 'modal' as any }}
    />
    <Stack.Screen
      name="Contribute"
      component={ContributeScreen}
      options={{ headerShown: false, animation: 'fade' as any, presentation: 'modal' as any }}
    />
  </>
);

function DiscoverStack() {
  return (
    <Stack.Navigator screenOptions={{ ...stackOptions, cardStyleInterpolator, headerShown: false } as any}>
      <Stack.Screen name="DiscoverList" component={DiscoverScreen} options={{ headerShown: false }} />
      {sharedScreens}
    </Stack.Navigator>
  );
}

function SavedStack() {
  return (
    <Stack.Navigator screenOptions={{ ...stackOptions, cardStyleInterpolator, headerShown: false } as any}>
      <Stack.Screen name="SavedList" component={SavedScreen} options={{ headerShown: false }} />
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
    <Stack.Navigator screenOptions={{ ...stackOptions, cardStyleInterpolator, headerShown: false } as any}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Album" component={AlbumScreen} options={{ headerShown: false }} />
      <Stack.Screen name="LocationAlbum" component={LocationAlbumScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Auth" component={AuthScreen} options={{ title: 'Sign In', headerShown: false, animation: 'fade' as any, presentation: 'modal' as any }} />
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AdminDetail" component={AdminDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AdminResearch" component={AdminResearchScreen} options={{ headerShown: false }} />
      {sharedScreens}
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

  // Five equal horizontal slots: Nearby | Discover | + | Saved | Profile.
  // The '+' occupies the middle slot, so Saved/Profile are pushed one slot over.
  const TOTAL_SLOTS = 5;
  const slotOfRoute = (routeIndex: number) => (routeIndex >= 2 ? routeIndex + 1 : routeIndex);
  const activeSlot = slotOfRoute(state.index);

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

  // Opens the guided contribution flow (a modal registered in every tab stack).
  // 'Contribute' lives inside each tab's stack, so navigate into the active
  // tab's stack rather than at the tab-bar level (where it is not registered).
  const handleContribute = useCallback(() => {
    try {
      const activeRoute = state.routes[state.index];
      if (activeRoute) {
        navigation.navigate(activeRoute.name, { screen: 'Contribute' });
      }
    } catch {
      /* ignore */
    }
  }, [state, navigation]);

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
            left: `${(activeSlot + 0.5) * (100 / TOTAL_SLOTS)}%`,
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
          <Fragment key={route.key}>
            {/* Reserve the middle slot for the raised '+' */}
            {index === 2 && <View style={styles.tabSpacer} />}
            <TouchableOpacity
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
          </Fragment>
        );
      })}

      {/* Raised center "+" — opens the contribution flow */}
      <TouchableOpacity
        style={styles.contributeButton}
        onPress={handleContribute}
        activeOpacity={0.85}
        accessibilityLabel="Add a photo and describe a filming location"
      >
        <Text style={styles.contributeIcon}>+</Text>
      </TouchableOpacity>
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
  tabSpacer: {
    flex: 1,
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
  contributeButton: {
    position: 'absolute',
    top: -18,
    left: '50%',
    marginLeft: -31,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: theme.colors.gold,
    borderWidth: 5,
    borderColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.gold,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  contributeIcon: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.colors.black,
    marginTop: -4,
  },
});