import React from 'react';
import { ViewStyle, StyleSheet, StyleProp } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

interface PremiumPageTransitionProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    delay?: number;
}

export function PremiumPageTransition({
    children,
    style,
    delay = 0
}: PremiumPageTransitionProps) {
    return (
        <Animated.View
            style={[
                styles.container,
                style,
                // Optional: padding adjustment if needed, but usually handled by SafeAreaView in screens
            ]}
            entering={FadeIn.springify().damping(20).delay(delay)}
        >
            <Animated.View
                style={styles.content}
                entering={SlideInDown.springify().damping(20).stiffness(100).mass(0.8).delay(delay)}
            >
                {children}
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
});
