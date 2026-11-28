'use client';

import React from 'react';

interface TerminalAccessGateProps {
  children: React.ReactNode;
  showStatusBanner?: boolean;
}

export function TerminalAccessGate({ children }: TerminalAccessGateProps) {
  return <>{children}</>;
}
