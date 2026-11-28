'use client';

import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { TerminalAccessGate } from '@/components/auth/TerminalAccessGate';
import { evaluateSubscriptionAccess } from '@/lib/auth/subscriptionAccess';

export default function TerminalSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
