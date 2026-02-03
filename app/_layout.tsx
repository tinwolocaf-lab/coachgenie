import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Colors } from '@/constants/theme';
import { isOnboardingComplete } from '@/store/onboarding';

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      await isOnboardingComplete();
    } catch (error) {
      console.error('Error checking onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.electricIndigo} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.offWhite },
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              animation: 'none',
            }}
          />
          <Stack.Screen
            name="onboarding"
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="(tabs)"
            options={{
              animation: 'fade',
            }}
          />
          <Stack.Screen
            name="chat/[coachId]"
            options={{
              animation: 'slide_from_bottom',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="coach/[id]"
            options={{
              animation: 'slide_from_right',
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.offWhite,
  },
});
