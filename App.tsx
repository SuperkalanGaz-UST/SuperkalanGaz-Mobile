import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/contexts/AuthContext';
import { RootNavigator } from '@/navigation/RootNavigator';
import { colors } from '@/theme/colors';
import { fontMap } from '@/theme/fonts';

/**
 * App root. Loads the brand typeface (Poppins) before rendering so text never
 * flashes in a fallback font, then hands off to AuthProvider + RootNavigator.
 * Keep this shell thin — all screens live under `src/screens`.
 */
export default function App() {
  const [fontsLoaded] = useFonts(fontMap);

  if (!fontsLoaded) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.loginBackground,
  },
});
