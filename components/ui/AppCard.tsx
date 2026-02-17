import React from 'react';
import { Card, type CardProps } from './Card';

export type AppCardProps = CardProps;

export function AppCard(props: AppCardProps) {
  return <Card {...props} />;
}

export default AppCard;
