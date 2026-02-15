import React, { useEffect, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent, Dimensions, TouchableOpacity } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import Animated, {
    useAnimatedStyle,
    withSpring,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Shadows, Spacing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_WIDTH = SCREEN_WIDTH - Spacing.xl * 2;
const TAB_BAR_HEIGHT = 72;

export function PremiumTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const { palette, atmosphere } = useThemeSafe();
    const isDark = atmosphere.id === 'midnight-gallery';

    const [layout, setLayout] = useState<{ x: number; width: number }[]>([]);
    const translateX = useSharedValue(0);
    const indicatorWidth = useSharedValue(0);

    // Initialize with estimated values to avoid jump
    useEffect(() => {
        if (layout.length === state.routes.length) {
            const activeTab = layout[state.index];
            translateX.value = withSpring(activeTab.x, {
                damping: 25,
                stiffness: 200,
            });
            indicatorWidth.value = withSpring(activeTab.width, {
                damping: 25,
                stiffness: 200,
            });
        } else if (state.routes.length > 0) {
            // Fallback estimation
            const estimatedWidth = TAB_BAR_WIDTH / state.routes.length;
            translateX.value = estimatedWidth * state.index;
            indicatorWidth.value = estimatedWidth;
        }
    }, [state.index, layout, translateX, indicatorWidth, state.routes.length]);

    const animatedIndicatorStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
        width: indicatorWidth.value,
    }));

    const handleLayout = (event: LayoutChangeEvent, index: number) => {
        const { x, width } = event.nativeEvent.layout;
        setLayout((prev) => {
            const newLayout = [...prev];
            newLayout[index] = { x, width };
            return newLayout;
        });
    };

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + Spacing.sm }]}>
            <Animated.View style={styles.floatingBar}>
                {/* Glass Background */}
                <BlurView
                    intensity={isDark ? 80 : 95}
                    tint={isDark ? 'dark' : 'light'}
                    style={StyleSheet.absoluteFill}
                />

                {/* Subtle Gradient Overlays for Depth */}
                <LinearGradient
                    colors={isDark
                        ? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.02)']
                        : ['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.2)']}
                    style={StyleSheet.absoluteFill}
                />

                {/* Top Edge Highlight (Specular) */}
                <View style={[styles.specularHighlight, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.8)'
                }]} />

                {/* Active Indicator (The "Spotlight") */}
                <Animated.View style={[styles.indicatorContainer, animatedIndicatorStyle]}>
                    <View style={[styles.indicator, { backgroundColor: palette.accent }]} />
                    <View style={[styles.indicatorGlow, { backgroundColor: palette.accent, shadowColor: palette.accent }]} />
                </Animated.View>

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    {state.routes.map((route, index) => {
                        const { options } = descriptors[route.key];
                        const isFocused = state.index === index;

                        const onPress = () => {
                            const event = navigation.emit({
                                type: 'tabPress',
                                target: route.key,
                                canPreventDefault: true,
                            });

                            if (!isFocused && !event.defaultPrevented) {
                                navigation.navigate(route.name);
                            }
                        };

                        const onLongPress = () => {
                            navigation.emit({
                                type: 'tabLongPress',
                                target: route.key,
                            });
                        };

                        // Icon Mapping
                        let iconName: keyof typeof Ionicons.glyphMap = 'help-circle';
                        let iconOutline: keyof typeof Ionicons.glyphMap = 'help-circle-outline';

                        if (route.name === 'index') {
                            iconName = 'home';
                            iconOutline = 'home-outline';
                        } else if (route.name === 'coaches') {
                            iconName = 'grid';
                            iconOutline = 'grid-outline';
                        } else if (route.name === 'plan') {
                            iconName = 'calendar';
                            iconOutline = 'calendar-outline';
                        } else if (route.name === 'vault') {
                            iconName = 'diamond';
                            iconOutline = 'diamond-outline';
                        }

                        return (
                            <TabItem
                                key={route.key}
                                isFocused={isFocused}
                                onPress={onPress}
                                onLongPress={onLongPress}
                                onLayout={(e) => handleLayout(e, index)}
                                iconName={iconName}
                                iconOutline={iconOutline}
                                label={options.title || route.name}
                                activeColor={isFocused ? '#FFF' : palette.textSecondary}
                                accentColor={palette.accent}
                                focusedColor={palette.textInverse}
                            />
                        );
                    })}
                </View>
            </Animated.View>
        </View>
    );
}

function TabItem({
    isFocused,
    onPress,
    onLongPress,
    onLayout,
    iconName,
    iconOutline,
    label,
    activeColor,
    accentColor,
    focusedColor,
}: {
    isFocused: boolean;
    onPress: () => void;
    onLongPress: () => void;
    onLayout: (event: LayoutChangeEvent) => void;
    iconName: keyof typeof Ionicons.glyphMap;
    iconOutline: keyof typeof Ionicons.glyphMap;
    label: string;
    activeColor: string;
    accentColor: string;
    focusedColor: string;
}) {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0.6);

    useEffect(() => {
        scale.value = withSpring(isFocused ? 1 : 0.9, { damping: 12 });
        opacity.value = withTiming(isFocused ? 1 : 0.5, { duration: 200 });
    }, [isFocused, scale, opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    return (
        <TouchableOpacity
            onPress={onPress}
            onLongPress={onLongPress}
            onLayout={onLayout}
            style={styles.tabItem}
            activeOpacity={0.8}
        >
            <Animated.View style={[styles.itemContent, animatedStyle]}>
                <Ionicons
                    name={isFocused ? iconName : iconOutline}
                    size={24}
                    color={isFocused ? focusedColor : activeColor}
                />
                <Animated.Text
                    style={[
                        styles.label,
                        {
                            color: isFocused ? focusedColor : activeColor,
                            opacity: isFocused ? 1 : 0.7
                        }
                    ]}
                    numberOfLines={1}
                >
                    {label}
                </Animated.Text>
            </Animated.View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'box-none',
    },
    floatingBar: {
        width: TAB_BAR_WIDTH,
        height: TAB_BAR_HEIGHT,
        borderRadius: 36, // Extra rounded
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
        ...Shadows.lg, // Deep shadow for floating effect
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    tabsContainer: {
        flexDirection: 'row',
        flex: 1,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xs,
    },
    tabItem: {
        flex: 1,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    itemContent: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    label: {
        fontSize: 10,
        fontFamily: Typography.fonts.sansMedium,
        fontWeight: '600',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    indicatorContainer: {
        position: 'absolute',
        top: 6,
        left: 0, // Will be driven by translateX
        bottom: 6,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 0,
    },
    indicator: {
        width: '100%',
        height: '100%',
        borderRadius: 30,
        opacity: 0.9,
    },
    indicatorGlow: {
        position: 'absolute',
        width: '80%',
        height: '60%',
        borderRadius: 20,
        opacity: 0.6,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 15,
    },
    specularHighlight: {
        position: 'absolute',
        top: 0,
        left: 20,
        right: 20,
        height: 1,
        opacity: 0.5,
    },
});
