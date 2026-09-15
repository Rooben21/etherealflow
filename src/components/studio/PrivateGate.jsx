import React from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ShieldCheck, Loader2 } from 'lucide-react';
export default function PrivateGate() {
  const { data: user, isLoading } = useQuery({ queryKey: ['studio-user'], queryFn: () => base44.auth.me() });
  if (isLoading) return <div className="min-h-screen grid place-items-center"><Loader2 className="animate-spin" /></div>;
  if (user?.role !== 'admin') return <main className="min-h-screen grid place-items-center p-8"><div className="text-center"><ShieldCheck className="mx-auto mb-4" /><h1 className="text-2xl">Приватна студія</h1><p className="text-muted-foreground mt-3">Доступ дозволений лише власнику.</p><button className="studio-button mt-6" onClick={() => base44.auth.logout('/login')}>Вийти</button></div></main>;
  return <Outlet />;
}