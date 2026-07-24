import "react-native-url-polyfill/auto";
import { useEffect } from "react";
import { ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { JetBrainsMono_500Medium } from "@expo-google-fonts/jetbrains-mono";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import { ThemeProvider, useTheme } from "./src/contexts/ThemeContext";
import { LanguageProvider } from "./src/contexts/LanguageContext";
import { AppShell } from "./src/screens/AppShell";
import { LoginScreen } from "./src/screens/LoginScreen";
import { ResetPasswordScreen } from "./src/screens/ResetPasswordScreen";
import { colors } from "./src/theme";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

function Root() {
  const { session, loading, recovery } = useAuth();
  const { isDark } = useTheme();
  useEffect(() => {}, [session]);

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isDark
            ? colors.dark.background
            : colors.light.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.light.primary} />
      </SafeAreaView>
    );
  }
  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      {session && recovery ? (
        <ResetPasswordScreen />
      ) : session ? (
        <AppShell />
      ) : (
        <LoginScreen />
      )}
    </>
  );
}

export default function App() {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_500Medium,
  });
  if (!loaded) return null;
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
            <Root />
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
