'use client';
// Department helpers for the UI — departments come from the server (Admin → Departments).
import { useMemo } from 'react';
import { useStore } from './store';

export function useDepartments() {
  const departments = useStore((s) => s.departments);
  return useMemo(() => {
    const byName = Object.fromEntries(departments.map((d) => [d.name, d]));
    return {
      all: departments,
      /** departments that hold shop products */
      product: departments.filter((d) => d.kind === 'products'),
      /** departments that hold commodities (quote only) */
      trading: departments.filter((d) => d.kind === 'trading'),
      /** departments shown on the storefront (not hidden) */
      visible: departments.filter((d) => d.status !== 'hidden'),
      byName,
      isTrading: (name) => byName[name]?.kind === 'trading',
    };
  }, [departments]);
}
