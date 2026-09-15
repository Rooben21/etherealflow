import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Паролі не збігаються");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.resetPassword({ resetToken, newPassword });
      window.location.href = "/login";
    } catch (err) {
      setError(err.message || "Не вдалося змінити пароль");
    } finally {
      setLoading(false);
    }
  };

  if (!resetToken) return <AuthLayout icon={AlertTriangle} title="Недійсне посилання" subtitle="Посилання відсутнє або некоректне" footer={<Link to="/forgot-password" className="text-primary hover:underline">Отримати нове посилання</Link>}><p className="text-sm text-center">Запитайте новий лист для відновлення пароля.</p></AuthLayout>;
  return <AuthLayout icon={Lock} title="Новий пароль" subtitle="Введіть і підтвердьте новий пароль">{error&&<div role="alert" className="mb-4 p-3 rounded-lg text-rose-300 bg-rose-500/10 text-sm">{error}</div>}<form onSubmit={handleSubmit} className="space-y-4"><div className="space-y-2"><Label htmlFor="password">Новий пароль</Label><Input id="password" type="password" autoComplete="new-password" autoFocus placeholder="••••••••" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="h-12" required/></div><div className="space-y-2"><Label htmlFor="confirm">Підтвердьте пароль</Label><Input id="confirm" type="password" autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="h-12" required/></div><Button type="submit" disabled={loading} className="w-full h-12">{loading?<><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Збереження…</>:"Зберегти пароль"}</Button></form></AuthLayout>;
}