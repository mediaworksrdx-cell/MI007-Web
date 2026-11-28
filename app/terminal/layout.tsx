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
  const [locked, setLocked] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const update = () => setLocked(evaluateSubscriptionAccess().isLockedOut);
    update();
    window.addEventListener('mi007-user-updated', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('mi007-user-updated', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  return (
    <>
      {locked !== false && <Navbar />}
      <TerminalAccessGate>{children}</TerminalAccessGate>
    </>
  );
}
