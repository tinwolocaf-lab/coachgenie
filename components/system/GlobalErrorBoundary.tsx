import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { initializeGlobalErrorHandling, subscribeToAppIssues, type AppIssue } from '@/lib/errorHandling';

interface GlobalErrorBoundaryProps {
  children: React.ReactNode;
}

interface InnerBoundaryProps {
  children: React.ReactNode;
  onNavigateHome: () => void;
}

interface InnerBoundaryState {
  error: Error | null;
  issue: AppIssue | null;
  showIssueBanner: boolean;
}

class InnerGlobalErrorBoundary extends React.Component<InnerBoundaryProps, InnerBoundaryState> {
  static getDerivedStateFromError(error: Error): InnerBoundaryState {
    return {
      error,
      issue: null,
      showIssueBanner: false,
    };
  }

  private teardownGlobalHandling: (() => void) | null = null;
  private unsubscribeIssues: (() => void) | null = null;
  private issueTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: InnerBoundaryProps) {
    super(props);
    this.state = {
      error: null,
      issue: null,
      showIssueBanner: false,
    };
  }

  componentDidMount() {
    this.teardownGlobalHandling = initializeGlobalErrorHandling();
    this.unsubscribeIssues = subscribeToAppIssues((issue) => {
      if (this.state.error) return;
      this.setState({ issue, showIssueBanner: true });
      this.scheduleBannerDismiss();
    });
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Keep this logging; it is the last line of defense for render tree crashes.
    console.error('[GlobalErrorBoundary] Render error:', error, info.componentStack);
  }

  componentWillUnmount() {
    this.teardownGlobalHandling?.();
    this.unsubscribeIssues?.();
    if (this.issueTimer) {
      clearTimeout(this.issueTimer);
      this.issueTimer = null;
    }
  }

  private scheduleBannerDismiss() {
    if (this.issueTimer) {
      clearTimeout(this.issueTimer);
    }
    this.issueTimer = setTimeout(() => {
      this.setState({ showIssueBanner: false });
    }, 6000);
  }

  private handleRetry = () => {
    this.setState({
      error: null,
      issue: null,
      showIssueBanner: false,
    });
  };

  private handleDismissBanner = () => {
    this.setState({ showIssueBanner: false });
  };

  private getIssueTitle(issue: AppIssue): string {
    switch (issue.kind) {
      case 'navigation_action_warning':
        return 'Navigation Warning';
      case 'unhandled_rejection':
        return 'Unhandled Async Error';
      case 'fatal_exception':
        return 'Unhandled Exception';
      case 'console_error':
        return 'Runtime Error';
      case 'console_warning':
        return 'Runtime Warning';
      default:
        return 'Application Issue';
    }
  }

  render() {
    const { error, issue, showIssueBanner } = this.state;
    const { children, onNavigateHome } = this.props;

    if (error) {
      return (
        <View style={styles.fallbackContainer}>
          <View style={styles.card}>
            <Text style={styles.title}>Something Went Wrong</Text>
            <Text style={styles.subtitle}>
              The app hit an unexpected error. You can retry or go back to the home screen.
            </Text>

            <ScrollView style={styles.errorBox}>
              <Text style={styles.errorText}>{error.message || 'Unknown error'}</Text>
              {error.stack ? (
                <Text style={styles.stackText}>{error.stack}</Text>
              ) : null}
            </ScrollView>

            <View style={styles.actions}>
              <TouchableOpacity style={[styles.button, styles.retryButton]} onPress={this.handleRetry}>
                <Text style={styles.buttonText}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.homeButton]} onPress={onNavigateHome}>
                <Text style={styles.buttonText}>Go Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return (
      <>
        {children}
        {showIssueBanner && issue ? (
          <View style={styles.banner}>
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>{this.getIssueTitle(issue)}</Text>
              <Text numberOfLines={2} style={styles.bannerMessage}>
                {issue.message}
              </Text>
            </View>
            <TouchableOpacity onPress={this.handleDismissBanner} style={styles.bannerDismiss}>
              <Text style={styles.bannerDismissText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </>
    );
  }
}

export function GlobalErrorBoundary({ children }: GlobalErrorBoundaryProps) {
  const router = useRouter();

  const navigateHome = () => {
    router.replace('/(tabs)');
  };

  return (
    <InnerGlobalErrorBoundary onNavigateHome={navigateHome}>
      {children}
    </InnerGlobalErrorBoundary>
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#C7C7C7',
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  errorBox: {
    maxHeight: 220,
    backgroundColor: '#111111',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#FFB4B4',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  stackText: {
    color: '#A9A9A9',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButton: {
    backgroundColor: '#2E5BFF',
  },
  homeButton: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  banner: {
    position: 'absolute',
    top: 52,
    left: 12,
    right: 12,
    backgroundColor: '#1F1F1F',
    borderColor: '#3A3A3A',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    color: '#FFD27A',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  bannerMessage: {
    color: '#E0E0E0',
    fontSize: 12,
  },
  bannerDismiss: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  bannerDismissText: {
    color: '#9FC2FF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default GlobalErrorBoundary;
