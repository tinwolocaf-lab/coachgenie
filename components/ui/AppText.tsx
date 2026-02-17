import React from 'react';
import { Text, TextProps, TextStyle, StyleProp } from 'react-native';
import { Typography } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';

export type AppTextVariant =
  | 'display'
  | 'headline'
  | 'title'
  | 'subtitle'
  | 'bodyLarge'
  | 'body'
  | 'caption'
  | 'micro'
  | 'label';

export type AppTextTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'inverse'
  | 'accent'
  | 'success'
  | 'warning'
  | 'error';

export type AppTextWeight = 'light' | 'regular' | 'medium' | 'semibold' | 'bold';

export interface AppTextProps extends TextProps {
  variant?: AppTextVariant;
  tone?: AppTextTone;
  weight?: AppTextWeight;
  style?: StyleProp<TextStyle>;
  uppercase?: boolean;
}

function fontFamilyFor(variant: AppTextVariant, weight: AppTextWeight): string {
  const isDisplay = variant === 'display' || variant === 'headline' || variant === 'title';
  if (isDisplay) {
    if (weight === 'regular') return Typography.fonts.serifRegular;
    if (weight === 'medium') return Typography.fonts.serifMedium;
    return Typography.fonts.serif;
  }

  if (weight === 'light') return Typography.fonts.sansLight;
  if (weight === 'regular') return Typography.fonts.sans;
  if (weight === 'medium') return Typography.fonts.sansMedium;
  if (weight === 'semibold') return Typography.fonts.sansSemibold;
  return Typography.fonts.sansBold;
}

function styleForVariant(variant: AppTextVariant, weight: AppTextWeight): TextStyle {
  switch (variant) {
    case 'display':
      return {
        fontSize: Typography.sizes.display,
        lineHeight: Math.round(Typography.sizes.display * Typography.lineHeights.tight),
        letterSpacing: Typography.letterSpacing.editorial,
        fontFamily: fontFamilyFor(variant, weight),
      };
    case 'headline':
      return {
        fontSize: Typography.sizes.headline,
        lineHeight: Math.round(Typography.sizes.headline * Typography.lineHeights.tight),
        letterSpacing: Typography.letterSpacing.editorial,
        fontFamily: fontFamilyFor(variant, weight),
      };
    case 'title':
      return {
        fontSize: Typography.sizes.title,
        lineHeight: Math.round(Typography.sizes.title * Typography.lineHeights.snug),
        letterSpacing: Typography.letterSpacing.tight,
        fontFamily: fontFamilyFor(variant, weight),
      };
    case 'subtitle':
      return {
        fontSize: Typography.sizes.subtitle,
        lineHeight: Math.round(Typography.sizes.subtitle * Typography.lineHeights.snug),
        letterSpacing: Typography.letterSpacing.normal,
        fontFamily: fontFamilyFor(variant, weight),
      };
    case 'bodyLarge':
      return {
        fontSize: Typography.sizes.bodyLarge,
        lineHeight: Math.round(Typography.sizes.bodyLarge * Typography.lineHeights.normal),
        letterSpacing: Typography.letterSpacing.normal,
        fontFamily: fontFamilyFor(variant, weight),
      };
    case 'caption':
      return {
        fontSize: Typography.sizes.caption,
        lineHeight: Math.round(Typography.sizes.caption * Typography.lineHeights.normal),
        letterSpacing: Typography.letterSpacing.wide,
        fontFamily: fontFamilyFor(variant, weight),
      };
    case 'micro':
      return {
        fontSize: Typography.sizes.micro,
        lineHeight: Math.round(Typography.sizes.micro * Typography.lineHeights.normal),
        letterSpacing: Typography.letterSpacing.wider,
        fontFamily: fontFamilyFor(variant, weight),
      };
    case 'label':
      return {
        fontSize: Typography.sizes.caption,
        lineHeight: Math.round(Typography.sizes.caption * Typography.lineHeights.snug),
        letterSpacing: Typography.letterSpacing.widest,
        fontFamily: fontFamilyFor(variant, weight),
      };
    case 'body':
    default:
      return {
        fontSize: Typography.sizes.body,
        lineHeight: Math.round(Typography.sizes.body * Typography.lineHeights.normal),
        letterSpacing: Typography.letterSpacing.normal,
        fontFamily: fontFamilyFor(variant, weight),
      };
  }
}

export function AppText({
  variant = 'body',
  tone = 'primary',
  weight = 'regular',
  style,
  uppercase = false,
  allowFontScaling = true,
  maxFontSizeMultiplier = 1.4,
  ...props
}: AppTextProps) {
  const { palette } = useThemeSafe();

  const toneStyle: TextStyle = {
    color:
      tone === 'primary'
        ? palette.textPrimary
        : tone === 'secondary'
          ? palette.textSecondary
          : tone === 'tertiary'
            ? palette.textTertiary
            : tone === 'inverse'
              ? palette.textInverse
              : tone === 'accent'
                ? palette.accent
                : tone === 'success'
                  ? palette.success
                  : tone === 'warning'
                    ? palette.warning
                    : palette.error,
  };

  const uppercaseStyle: TextStyle | undefined = uppercase
    ? { textTransform: 'uppercase', letterSpacing: Typography.letterSpacing.wider }
    : undefined;

  return (
    <Text
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[styleForVariant(variant, weight), toneStyle, uppercaseStyle, style]}
      {...props}
    />
  );
}

export default AppText;
