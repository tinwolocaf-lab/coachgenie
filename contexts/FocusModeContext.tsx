import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import {
  useSharedValue,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';

interface FocusModeContextType {
  isFocusMode: boolean;
  enterFocusMode: () => void;
  exitFocusMode: () => void;
  toggleFocusMode: () => void;
  dockOpacity: SharedValue<number>;
  dockTranslateY: SharedValue<number>;
}

const FocusModeContext = createContext<FocusModeContextType | undefined>(undefined);

interface FocusModeProviderProps {
  children: ReactNode;
}

export function FocusModeProvider({ children }: FocusModeProviderProps) {
  const [isFocusMode, setIsFocusMode] = useState(false);
  const dockOpacity = useSharedValue(1);
  const dockTranslateY = useSharedValue(0);

  const enterFocusMode = useCallback(() => {
    setIsFocusMode(true);
    dockOpacity.value = withTiming(0, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
    dockTranslateY.value = withTiming(100, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, [dockOpacity, dockTranslateY]);

  const exitFocusMode = useCallback(() => {
    setIsFocusMode(false);
    dockOpacity.value = withTiming(1, {
      duration: 350,
      easing: Easing.out(Easing.cubic),
    });
    dockTranslateY.value = withTiming(0, {
      duration: 350,
      easing: Easing.out(Easing.cubic),
    });
  }, [dockOpacity, dockTranslateY]);

  const toggleFocusMode = useCallback(() => {
    if (isFocusMode) {
      exitFocusMode();
    } else {
      enterFocusMode();
    }
  }, [isFocusMode, enterFocusMode, exitFocusMode]);

  const value = useMemo(() => ({
    isFocusMode,
    enterFocusMode,
    exitFocusMode,
    toggleFocusMode,
    dockOpacity,
    dockTranslateY,
  }), [isFocusMode, enterFocusMode, exitFocusMode, toggleFocusMode, dockOpacity, dockTranslateY]);

  return (
    <FocusModeContext.Provider value={value}>
      {children}
    </FocusModeContext.Provider>
  );
}

export function useFocusMode(): FocusModeContextType {
  const context = useContext(FocusModeContext);
  if (!context) {
    throw new Error('useFocusMode must be used within a FocusModeProvider');
  }
  return context;
}

export function useFocusModeSafe() {
  const context = useContext(FocusModeContext);
  if (!context) {
    const dummyShared = { value: 1 } as SharedValue<number>;
    const dummyTranslate = { value: 0 } as SharedValue<number>;
    return {
      isFocusMode: false,
      enterFocusMode: () => {},
      exitFocusMode: () => {},
      toggleFocusMode: () => {},
      dockOpacity: dummyShared,
      dockTranslateY: dummyTranslate,
    };
  }
  return context;
}

export default FocusModeContext;
