/**
 * Custom app entry point for CoachZeno
 *
 * This replaces the default expo-router/entry to also register
 * the Android widget task handler alongside the main app.
 *
 * The widget task handler runs in a headless JS context when
 * Android triggers widget lifecycle events (add, update, click, resize, delete).
 */
import 'expo-router/entry';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './widgets/android/widget-task-handler';

registerWidgetTaskHandler(widgetTaskHandler);
