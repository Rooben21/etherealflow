import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email);
    } catch {
      // Always show success regardless
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return <AuthLayout icon={Mail} title="Відновлення пароля" subtitle="Надішлемо посилання для відновлення" footer={<Link to="/login" className="text-primary font-medium hover:underline"><ArrowLeft className="w-3 h-3 inline mr-1"/>Назад до входу</Link>}>
    {sent ? <p className="text-sm text-center">Якщо обліковий запис із цією адресою існує, ви отримаєте лист із посиланням для відновлення пароля.</p> : <form onSubmit={handleSubmit} className="space-y-4"><div className="space-y-2"><Label htmlFor="email">Електронна пошта</Label><Input id="email" type="email" autoComplete="email" autoFocus placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} className="h-12" required/></div><Button type="submit" className="w-full h-12" disabled={loading}>{loading?<><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Надсилання…</>:"Надіслати посилання"}</Button></form>}
  </AuthLayout>;
}