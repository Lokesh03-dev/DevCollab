import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function RegisterPage() {
  const { authError, clearAuthError, isSubmitting, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    clearAuthError();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      await register(form);
      navigate('/dashboard', { replace: true });
    } catch {
      return;
    }
  }

  return (
    <main className="grid min-h-screen bg-[#f4f6f3] lg:grid-cols-[0.9fr_1fr]">
      <section className="flex items-center justify-center px-5 py-12 lg:order-2">
        <div className="animate-lift-in w-full max-w-110">
          <Link className="mb-10 inline-flex items-center gap-2 font-display font-semibold text-[#294d3c]" to="/dashboard"><span className="grid size-9 place-items-center rounded-lg bg-[#db8c63] text-xs text-[#243d33]">DC</span> DevCollab</Link>
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#64806f]">Get started</p><h1 className="font-display mt-2 text-3xl font-semibold text-[#25332c]">Create your account</h1><p className="mt-2 text-sm text-[#78857d]">Set up your profile to join a team workspace.</p>
          <form className="mt-7 grid gap-4" onSubmit={handleSubmit}>
            <Input autoComplete="name" label="Full name" name="name" onChange={updateField} placeholder="Your name" required value={form.name} />
            <Input autoComplete="email" label="Work email" name="email" onChange={updateField} placeholder="you@company.com" required type="email" value={form.email} />
            <Input autoComplete="new-password" label="Password" name="password" onChange={updateField} placeholder="Create a password" required type="password" value={form.password} />
            {authError && <p className="text-sm text-[#a84436]" role="alert">{authError}</p>}
            <Button className="mt-2 w-full" disabled={isSubmitting} type="submit">{isSubmitting ? 'Creating account…' : 'Create account'}</Button>
          </form>
          <p className="mt-6 text-center text-sm text-[#77847b]">Already have an account? <Link className="font-semibold text-[#28664c] hover:underline" to="/login">Sign in</Link></p>
        </div>
      </section>
      <section className="relative hidden overflow-hidden bg-[#e5efe7] p-12 lg:order-1 lg:flex lg:flex-col lg:justify-between">
        <p className="font-display text-lg font-semibold text-[#294d3c]">Build in good company.</p>
        <div className="relative max-w-lg"><div className="absolute -left-7 -top-9 size-16 rounded-full bg-[#e8bd74]" /><h2 className="font-display relative text-5xl font-semibold leading-[1.08] text-[#2a4738]">A little more clarity. A lot more momentum.</h2><p className="mt-5 max-w-md text-base leading-7 text-[#5e7667]">Bring your projects and people together, without losing the details that matter.</p></div>
        <p className="text-xs text-[#758a7b]">DevCollab workspace preview</p>
      </section>
    </main>
  );
}