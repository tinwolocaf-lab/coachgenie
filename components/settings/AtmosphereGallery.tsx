import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInRight,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  useTheme,
  ATMOSPHERES,
  Atmosphere,
  AtmospherePalette,
} from '@/contexts/ThemeContext';
import { Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_WIDTH = SCREEN_WIDTH * 0.72;
const PREVIEW_HEIGHT = 180;

interface AtmosphereGalleryProps {
  onPremiumRequired?: () => void;
}

export function AtmosphereGallery({ onPremiumRequired }: AtmosphereGalleryProps) {
  const { atmosphere, palette, setAtmosphere, isSovereignMember } = useTheme();

  const handleSelectAtmosphere = async (atm: Atmosphere) => {
    if (atm.isPremium && !isSovereignMember) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      onPremiumRequired?.();
      return;
    }

    if (atm.id === atmosphere.id) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await setAtmosphere(atm.id);
  };

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: palette.textPrimary }]}>Atmospheres</Text>
        <Text style={[styles.subtitle, { color: palette.textTertiary }]}>
          Choose your visual experience
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={PREVIEW_WIDTH + Spacing.md}
        decelerationRate="fast"
      >
        {ATMOSPHERES.map((atm, index) => (
          <AtmospherePreviewCard
            key={atm.id}
            atmosphere={atm}
            isSelected={atmosphere.id === atm.id}
            isLocked={atm.isPremium && !isSovereignMember}
            onPress={() => handleSelectAtmosphere(atm)}
            index={index}
            currentPalette={palette}
          />
        ))}
      </ScrollView>
    </Animated.View>
  );
}

interface AtmospherePreviewCardProps {
  atmosphere: Atmosphere;
  isSelected: boolean;
  isLocked: boolean;
  onPress: () => void;
  index: number;
  currentPalette: AtmospherePalette;
}

function AtmospherePreviewCard({
  atmosphere,
  isSelected,
  isLocked,
  onPress,
  index,
  currentPalette,
}: AtmospherePreviewCardProps) {
  const scale = useSharedValue(1);
  const { palette } = atmosphere;

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(0.96, { duration: 100 }),
      withSpring(1, Timing.springBouncy)
    );
    onPress();
  };

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInRight.duration(400).delay(index * 80)}
      style={cardStyle}
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.95}
        style={[
          styles.previewCard,
          {
            borderColor: isSelected ? currentPalette.accent : currentPalette.borderLight,
            backgroundColor: currentPalette.cardBg,
          },
          isSelected && {
            borderWidth: 2,
            shadowColor: currentPalette.accent,
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 8,
          },
        ]}
      >
        {/* Mini Home Screen Preview */}
        <View style={[styles.miniPreview, { backgroundColor: palette.background }]}>
          {/* Header Area */}
          <View style={styles.miniHeader}>
            <View style={styles.miniGreeting}>
              <View style={[styles.miniTextLine, { backgroundColor: palette.textPrimary, width: 60 }]} />
              <View style={[styles.miniTextLine, { backgroundColor: palette.textTertiary, width: 40, height: 4, marginTop: 3 }]} />
            </View>
            <View style={[styles.miniAvatar, { backgroundColor: palette.accent }]} />
          </View>

          {/* Progress Card */}
          <View style={[styles.miniCard, { backgroundColor: palette.cardBg, borderColor: palette.borderLight }]}>
            <View style={[styles.miniProgressRing, { borderColor: palette.accent }]}>
              <View style={[styles.miniProgressCenter, { backgroundColor: palette.accentMuted }]} />
            </View>
            <View style={styles.miniCardContent}>
              <View style={[styles.miniTextLine, { backgroundColor: palette.textPrimary, width: 50 }]} />
              <View style={[styles.miniTextLine, { backgroundColor: palette.textTertiary, width: 35, marginTop: 3 }]} />
            </View>
          </View>

          {/* Coach Card */}
          {palette.useGradients ? (
            <LinearGradient
              colors={[palette.gradientStart, palette.gradientEnd]}
              style={styles.miniCoachCard}
            >
              <View style={[styles.miniCoachIcon, { backgroundColor: palette.accent + '40' }]} />
              <View style={styles.miniCoachContent}>
                <View style={[styles.miniTextLine, { backgroundColor: 'rgba(255,255,255,0.5)', width: 25 }]} />
                <View style={[styles.miniTextLine, { backgroundColor: palette.textInverse, width: 40, marginTop: 2 }]} />
              </View>
            </LinearGradient>
          ) : (
            <View style={[styles.miniCoachCard, { backgroundColor: palette.gradientStart }]}>
              <View style={[styles.miniCoachIcon, { backgroundColor: palette.accent + '40' }]} />
              <View style={styles.miniCoachContent}>
                <View style={[styles.miniTextLine, { backgroundColor: 'rgba(255,255,255,0.5)', width: 25 }]} />
                <View style={[styles.miniTextLine, { backgroundColor: palette.textInverse, width: 40, marginTop: 2 }]} />
              </View>
            </View>
          )}

          {/* Tab Bar */}
          <View style={[styles.miniTabBar, { backgroundColor: palette.tabBarBg }]}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.miniTabIcon,
                  { backgroundColor: i === 0 ? palette.tabBarActive : palette.tabBarInactive },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Locked Overlay */}
        {isLocked && (
          <View style={styles.lockedOverlay}>
            <View style={[styles.lockBadge, { backgroundColor: currentPalette.accent }]}>
              <Ionicons name="diamond" size={14} color={currentPalette.textInverse} />
              <Text style={[styles.lockText, { color: currentPalette.textInverse }]}>Sovereign</Text>
            </View>
          </View>
        )}

        {/* Selected Indicator */}
        {isSelected && (
          <View style={[styles.selectedBadge, { backgroundColor: currentPalette.accent }]}>
            <Ionicons name="checkmark" size={12} color={currentPalette.textInverse} />
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <Text
              style={[
                styles.atmosphereName,
                { color: currentPalette.textPrimary },
                isSelected && { color: currentPalette.accent },
              ]}
              numberOfLines={1}
            >
              {atmosphere.name}
            </Text>
            {atmosphere.isPremium && !isLocked && (
              <Ionicons name="diamond" size={12} color={currentPalette.accent} style={styles.premiumIcon} />
            )}
          </View>
          <Text
            style={[styles.atmosphereDescription, { color: currentPalette.textTertiary }]}
            numberOfLines={2}
          >
            {atmosphere.description}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xxl,
  },
  header: {
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
  },
  subtitle: {
    fontSize: Typography.sizes.body,
    marginTop: Spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
    paddingRight: Spacing.xxxl,
  },
  previewCard: {
    width: PREVIEW_WIDTH,
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadows.md,
  },
  miniPreview: {
    height: PREVIEW_HEIGHT,
    padding: Spacing.md,
    position: 'relative',
  },
  miniHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  miniGreeting: {},
  miniTextLine: {
    height: 6,
    borderRadius: 3,
  },
  miniAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  miniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  miniProgressRing: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  miniProgressCenter: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  miniCardContent: {
    flex: 1,
  },
  miniCoachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  miniCoachIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: Spacing.sm,
  },
  miniCoachContent: {
    flex: 1,
  },
  miniTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 22,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  miniTabIcon: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    gap: Spacing.xs,
  },
  lockText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    letterSpacing: Typography.letterSpacing.wide,
  },
  selectedBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  infoSection: {
    padding: Spacing.md,
    paddingTop: Spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  atmosphereName: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
  },
  premiumIcon: {
    marginLeft: Spacing.xs,
  },
  atmosphereDescription: {
    fontSize: Typography.sizes.caption,
    marginTop: 2,
    lineHeight: Typography.sizes.caption * Typography.lineHeights.relaxed,
  },
});

export default AtmosphereGallery;
