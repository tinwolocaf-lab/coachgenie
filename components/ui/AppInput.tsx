import React from 'react';
import { Input, type InputProps } from './Input';

export type AppInputProps = InputProps;

export function AppInput(props: AppInputProps) {
  return <Input {...props} />;
}

export default AppInput;
