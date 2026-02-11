import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { ImportCoachCard } from '@/components/coaching/ImportCoachCard';
import { resolveShareLink, CoachConfig } from '@/lib/coachSharing';

export default function ShareScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { shareId } = useLocalSearchParams<{ shareId: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coachConfig, setCoachConfig] = useState<CoachConfig | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);

  useEffect(() => {
    loadShareData();
  }, [shareId]);

  const loadShareData = async () => {
    if (!shareId) {
      setError('No share ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const resolved = await resolveShareLink(shareId);
      setCoachConfig(resolved.coachConfig);
      setCreatorId(resolved.creatorId);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load shared coach';
      setError(errorMessage);
      console.error('Error loading share:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImportSuccess = (coachId: string, coachName: string) => {
    // Navigate to the coach's first chat screen
    router.replace({
      pathname: '/chat/[coachId]',
      params: { coachId },
    });
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
          },
        ]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color="#d4af37"
          />
          <Text
            style={[
              styles.loadingText,
              {
                color: isDark ? '#b0b0d0' : '#666',
              },
            ]}
          >
            Loading shared coach...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
          },
        ]}
      >
        <View style={styles.errorContainer}>
          <View
            style={[
              styles.errorBox,
              {
                backgroundColor: isDark ? '#4a2a2a' : '#fff3f0',
                borderColor: isDark ? '#8a4a4a' : '#d9534f',
              },
            ]}
          >
            <Text
              style={[
                styles.errorTitle,
                {
                  color: isDark ? '#ff9999' : '#d9534f',
                },
              ]}
            >
              Unable to Load Coach
            </Text>

            <Text
              style={[
                styles.errorMessage,
                {
                  color: isDark ? '#c0a0a0' : '#999',
                },
              ]}
            >
              {error}
            </Text>

            <Text
              style={[
                styles.errorInfo,
                {
                  color: isDark ? '#a0a0a0' : '#999',
                },
              ]}
            >
              The link may have expired or be invalid. Please ask the person who shared it to send you a new link.
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: '#d4af37',
              },
            ]}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.actionButtonText}>Back to Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadShareData}
          >
            <Text
              style={[
                styles.retryButtonText,
                {
                  color: isDark ? '#d4af37' : '#1a1a2e',
                },
              ]}
            >
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!coachConfig || !creatorId || !shareId) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
          },
        ]}
      >
        <View style={styles.errorContainer}>
          <Text
            style={[
              styles.errorTitle,
              {
                color: isDark ? '#ff9999' : '#d9534f',
              },
            ]}
          >
            Coach Not Found
          </Text>

          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: '#d4af37',
              },
            ]}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.actionButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ImportCoachCard
      coachConfig={coachConfig}
      creatorId={creatorId}
      shareId={shareId}
      onImportSuccess={handleImportSuccess}
      onClose={() => router.back()}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 12,
  },
  errorInfo: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  actionButtonText: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: '700',
  },
  retryButton: {
    paddingVertical: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
