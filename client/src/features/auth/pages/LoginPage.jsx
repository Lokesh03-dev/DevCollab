import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { authError, clearAuthError, isSubmitting, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    clearAuthError();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      await login(form);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch {
      return;
    }
  }

  return (
    <main className="grid min-h-screen bg-[#f4f6f3] lg:grid-cols-[1fr_0.9fr]">
      <section className="relative hidden overflow-hidden bg-[#203c32] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Link className="flex items-center gap-3" to="/dashboard"><span className="grid size-10 place-items-center rounded-xl bg-[#db8c63] font-display text-sm font-bold text-[#243d33]">DC</span><span className="font-display text-lg font-semibold">DevCollab</span></Link>
        <div className="relative z-10 max-w-lg pb-10"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e5b58e]">Make good work together</p><h1 className="font-display mt-4 text-5xl font-semibold leading-[1.08]">Your team's work, moving in one direction.</h1><p className="mt-5 max-w-md text-base leading-7 text-[#c2d1c7]">Projects, decisions, and the people behind them, all in one place.</p></div>
        <div className="absolute -bottom-28 -right-20 size-96 rounded-full border border-white/10" /><div className="absolute -bottom-10 -right-2 size-60 rounded-full border border-[#d59a70]/40" />
        <p className="text-xs text-[#a9beb0]">A thoughtful workspace for people who build.</p>
      </section>
      <section className="flex items-center justify-center px-5 py-12">
        <div className="animate-lift-in w-full max-w-105">
          <Link className="mb-12 inline-flex items-center gap-2 font-display font-semibold text-[#294d3c] lg:hidden" to="/dashboard"><span className="grid size-9 place-items-center rounded-lg bg-[#db8c63] text-xs text-[#243d33]">DC</span> DevCollab</Link>
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#64806f]">Welcome back</p><h2 className="font-display mt-2 text-3xl font-semibold text-[#25332c]">Sign in to your workspace</h2><p className="mt-2 text-sm text-[#78857d]">Use your work email to continue.</p>
          <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
            <Input autoComplete="email" label="Email address" name="email" onChange={updateField} placeholder="you@company.com" required type="email" value={form.email} />
            <Input autoComplete="current-password" label="Password" name="password" onChange={updateField} placeholder="Enter your password" required type="password" value={form.password} />
            {authError && <p className="text-sm text-[#a84436]" role="alert">{authError}</p>}
            <Button className="mt-1 w-full" disabled={isSubmitting} type="submit">{isSubmitting ? 'Signing in…' : 'Sign in'}</Button>
          </form>
          <p className="mt-6 text-center text-sm text-[#77847b]">New to DevCollab? <Link className="font-semibold text-[#28664c] hover:underline" to="/register">Create an account</Link></p>
        </div>
      </section>
    </main>
  );
}