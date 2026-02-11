declare module '@expo/widgets' {
  import type { ComponentType, ReactNode } from 'react';

  interface BaseProps {
    children?: ReactNode;
    [key: string]: unknown;
  }

  interface WidgetProps extends BaseProps {
    family?: string;
    containerBackgroundColor?: string;
    padding?: number;
  }

  interface WidgetActivityProps extends BaseProps {
    uri: string;
    description?: string;
    isInteractive?: boolean;
  }

  type WidgetRoot = (props: WidgetProps) => JSX.Element | null;
  type WidgetActivity = (props: WidgetActivityProps) => JSX.Element | null;

  export const Widget: WidgetRoot & { Activity: WidgetActivity };
  export const Text: ComponentType<BaseProps>;
  export const VStack: ComponentType<BaseProps>;
  export const HStack: ComponentType<BaseProps>;
  export const Spacer: ComponentType<BaseProps>;
  export const Button: ComponentType<BaseProps>;
  export const Image: ComponentType<BaseProps>;
}
