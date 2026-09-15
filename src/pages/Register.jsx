import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { toast } from "@/components/ui/use-toast";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Паролі не збігаються");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setShowOtp(true);
    } catch (err) {
      setError(err.message || "Не вдалося створити обліковий запис");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
      }
      window.location.href = safeReturnTo();
    } catch (err) {
      setError(err.message || "Невірний код підтвердження");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email);
      toast({
        title: "Код надіслано",
        description: "Перевірте пошту та введіть новий код.",
      });
    } catch (err) {
      setError(err.message || "Не вдалося надіслати код повторно");
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", safeReturnTo());
  };

  if (showOtp) return <AuthLayout icon={Mail} title="Підтвердьте пошту" subtitle={`Код надіслано на ${email}`}>
    {error&&<div role="alert" className="text-sm text-rose-300 mb-4">{error}</div>}<div className="flex justify-center mb-6"><InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code"><InputOTPGroup>{[0,1,2,3,4,5].map(i=><InputOTPSlot index={i} key={i}/>)}</InputOTPGroup></InputOTP></div><Button className="w-full h-12" onClick={handleVerify} disabled={loading||otpCode.length<6}>{loading?'Перевірка…':'Підтвердити'}</Button><p className="text-center text-sm text-muted-foreground mt-4">Не отримали код? <button onClick={handleResend} className="text-primary hover:underline">Надіслати ще раз</button></p>
  </AuthLayout>;
  return <AuthLayout icon={UserPlus} title="Створення облікового запису" subtitle="Доступ до приватного застосунку — за запрошенням" footer={<Link to={"/login"+(safeReturnTo()!=="/"?"?returnTo="+encodeURIComponent(safeReturnTo()):"")} className="text-primary hover:underline">Увійти до облікового запису</Link>}>
    <Button variant="outline" className="w-full h-12 mb-6" onClick={handleGoogle}><GoogleIcon className="w-5 h-5 mr-2"/>Продовжити з Google</Button>{error&&<div role="alert" className="text-rose-300 text-sm mb-4">{error}</div>}<form onSubmit={handleSubmit} className="space-y-4"><div className="space-y-2"><Label htmlFor="email">Електронна пошта</Label><Input id="email" type="email" autoComplete="email" autoFocus value={email} onChange={e=>setEmail(e.target.value)} className="h-12" required/></div><div className="space-y-2"><Label htmlFor="password">Пароль</Label><Input id="password" type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className="h-12" required/></div><div className="space-y-2"><Label htmlFor="confirm">Підтвердьте пароль</Label><Input id="confirm" type="password" autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="h-12" required/></div><Button type="submit" disabled={loading} className="w-full h-12">{loading?'Створення…':'Створити обліковий запис'}</Button></form>
  </AuthLayout>;
}