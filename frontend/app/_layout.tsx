import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  const loadToken = useAuthStore((state) => state.loadToken);

  useEffect(() => {
    loadToken();
  }, [loadToken]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile/[handle]" />
      </Stack>
    </GestureHandlerRootView>
  );
}
