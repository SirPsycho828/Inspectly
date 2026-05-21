import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { colors, typography, spacing } from '@/constants/theme';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // Debounce to prevent flapping (3 seconds)
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        const offline = !state.isInternetReachable;
        if (!offline && isOffline) {
          // Transitioning from offline to online
          setSyncing(true);
          setIsOffline(false);
          setTimeout(() => {
            setSyncing(false);
            setJustReconnected(true);
            setTimeout(() => setJustReconnected(false), 3000);
          }, 2000);
        } else {
          setIsOffline(offline);
        }
      }, 3000);
    });
    return () => {
      unsubscribe();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [isOffline]);

  const visible = isOffline || syncing || justReconnected;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) return null;

  const backgroundColor = isOffline
    ? colors.severity.minorBg
    : justReconnected
      ? colors.successBg
      : colors.severity.minorBg;

  const textColor = isOffline
    ? colors.severity.minor
    : justReconnected
      ? colors.success
      : colors.severity.minor;

  const message = isOffline
    ? 'Offline \u2014 changes will sync when connected'
    : syncing
      ? 'Syncing...'
      : 'Back online';

  return (
    <Animated.View
      style={[
        styles.banner,
        { backgroundColor, opacity: slideAnim },
      ]}
    >
      <Text style={[styles.text, { color: textColor }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    ...typography.captionMedium,
  },
});
