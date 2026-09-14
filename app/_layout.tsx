import {SplashScreen, Stack} from "expo-router";
import { useFonts } from 'expo-font';
import { useEffect} from "react";

import './globals.css';
import * as Sentry from '@sentry/react-native';
import useAuthStore from "@/store/auth.store";
import { isVerificationBuild } from "@/verification/runtime";
import { resetObservationExport } from "@/verification/observation";

if (!isVerificationBuild) {
  Sentry.init({
  dsn: 'https://94edd17ee98a307f2d85d750574c454a@o4506876178464768.ingest.us.sentry.io/4509588544094208',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Configure Session Replay
  replaysSessionSampleRate: 1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
  });
}

function RootLayout() {
  const { isLoading, fetchAuthenticatedUser } = useAuthStore();

  const [fontsLoaded, error] = useFonts({
    "QuickSand-Bold": require('../assets/fonts/Quicksand-Bold.ttf'),
    "QuickSand-Medium": require('../assets/fonts/Quicksand-Medium.ttf'),
    "QuickSand-Regular": require('../assets/fonts/Quicksand-Regular.ttf'),
    "QuickSand-SemiBold": require('../assets/fonts/Quicksand-SemiBold.ttf'),
    "QuickSand-Light": require('../assets/fonts/Quicksand-Light.ttf'),
    "NotoSansSC-Regular": require('../assets/fonts/NotoSansSC-Regular-autophone-v1.ttf'),
    "NotoSansSC-SemiBold": require('../assets/fonts/NotoSansSC-SemiBold-autophone-v1.ttf'),
    "NotoSansSC-Bold": require('../assets/fonts/NotoSansSC-Bold-autophone-v1.ttf'),
  });

  useEffect(() => {
    if(error) throw error;
    if(fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded, error]);

  useEffect(() => {
    if (!isVerificationBuild) {
      void fetchAuthenticatedUser();
      return;
    }

    let active = true;
    void resetObservationExport().then(() => {
      if (!active) return;
      useAuthStore.setState({
        isAuthenticated: true,
        user: null,
        isLoading: false,
      });
    });
    return () => {
      active = false;
    };
  }, [fetchAuthenticatedUser]);

  if(!fontsLoaded || isLoading) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}

const ExportedRootLayout = isVerificationBuild
  ? RootLayout
  : Sentry.wrap(RootLayout);

export default ExportedRootLayout;

if (!isVerificationBuild) {
  Sentry.showFeedbackWidget();
}
