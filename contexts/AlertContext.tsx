import React, { createContext, useContext, useCallback, useState, useRef, type ReactNode } from 'react';
import { Toast } from '@/components/ui/Toast';
import { AlertDialog } from '@/components/ui/AlertDialog';

// Toast types
export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  variant?: ToastVariant;
  message?: string;
  duration?: number;
}

export interface ToastItem {
  id: string;
  title: string;
  variant: ToastVariant;
  message?: string;
  duration: number;
}

// Alert types — mirrors Alert.alert() signature
export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface AlertItem {
  id: string;
  title: string;
  message?: string;
  buttons: AlertButton[];
}

interface AlertContextType {
  showToast: (title: string, options?: ToastOptions) => void;
  showAlert: (title: string, message?: string, buttons?: AlertButton[]) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

const MAX_TOASTS = 3;

export function AlertProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [alert, setAlert] = useState<AlertItem | null>(null);
  const idCounter = useRef(0);

  const nextId = useCallback(() => {
    idCounter.current += 1;
    return `alert-${idCounter.current}-${Date.now()}`;
  }, []);

  const showToast = useCallback((title: string, options?: ToastOptions) => {
    const item: ToastItem = {
      id: nextId(),
      title,
      variant: options?.variant ?? 'info',
      message: options?.message,
      duration: options?.duration ?? 3000,
    };
    setToasts((prev) => {
      const next = [...prev, item];
      // Keep only the last MAX_TOASTS
      return next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next;
    });
  }, [nextId]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showAlert = useCallback((title: string, message?: string, buttons?: AlertButton[]) => {
    const item: AlertItem = {
      id: nextId(),
      title,
      message,
      buttons: buttons ?? [{ text: 'OK', style: 'default' }],
    };
    setAlert(item);
  }, [nextId]);

  const dismissAlert = useCallback(() => {
    setAlert(null);
  }, []);

  return (
    <AlertContext.Provider value={{ showToast, showAlert }}>
      {children}
      {/* Toasts render at top of screen */}
      {toasts.map((toast, index) => (
        <Toast
          key={toast.id}
          item={toast}
          index={index}
          onDismiss={dismissToast}
        />
      ))}
      {/* Alert dialog renders as centered modal */}
      {alert && (
        <AlertDialog
          item={alert}
          onDismiss={dismissAlert}
        />
      )}
    </AlertContext.Provider>
  );
}

export function useAlert(): AlertContextType {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}
