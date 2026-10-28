import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ShareIntentHandler } from '@/components/share/ShareIntentHandler';
import { ActionSheetHost, ErrorState, SnackbarHost } from '@/components/ui';
import { VoiceCaptureOverlay } from '@/components/voice/VoiceCaptureOverlay';
import { registerServices } from '@/features/app/services';
import { useAppServices } from '@/features/app/useAppServices';
import { useBootstrap } from '@/features/app/useBootstrap';
import { strings } from '@/i18n/strings';
import { useSettings } from '@/stores/settingsStore';
import { ThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();
registerServices();

export default function RootLayout() {
  const { state, retry } = useBootstrap();
  const preference = useSettings((s) => s.appearance.themePreference);

  useEffect(() => {
    if (state !== 'loading') SplashScreen.hideAsync();
  }, [state]);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <ThemeProvider preference={preference}>
        <BottomSheetModalProvider>
          {state === 'ready' && <ReadyApp />}
          {state === 'error' && <BootError onRetry={retry} />}
        </BottomSheetModalProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function ReadyApp() {
  useAppServices();
  return (
    <>
      <RootStack />
      <ShareIntentHandler />
      <VoiceCaptureOverlay />
      <SnackbarHost />
      <ActionSheetHost />
    </>
  );
}

function RootStack() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.colors.bg },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontSize: theme.typography.heading.fontSize,
          fontWeight: theme.typography.heading.fontWeight,
        },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: theme.colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="capture"
        options={{
          headerShown: false,
          presentation: 'transparentModal',
          animation: 'fade',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen name="review" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
      <Stack.Screen name="reader/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}

function BootError({ onRetry }: { onRetry: () => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.flex, styles.center, { backgroundColor: theme.colors.bg }]}>
      <ErrorState message={strings.boot.error} onRetry={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { justifyContent: 'center' },
});
