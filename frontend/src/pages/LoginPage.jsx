import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { email: '', password: '', rememberMe: true } });

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      await login(values);
      toast.success('Welcome back');
      const redirect = location.state?.from ?? '/chat';
      navigate(redirect, { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.error?.message ?? 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">Sign in</h2>
        <p className="mt-1 text-sm text-slate-400">Welcome back — pick up where you left off.</p>
      </div>

      <div>
        <label className="field-label" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="input"
          {...register('email', { required: 'Email is required' })}
        />
        {errors.email && <p className="field-error">{errors.email.message}</p>}
      </div>

      <div>
        <label className="field-label" htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className="input"
          {...register('password', { required: 'Password is required' })}
        />
        {errors.password && <p className="field-error">{errors.password.message}</p>}
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" className="h-4 w-4 rounded border-slate-600 bg-surface-raised" {...register('rememberMe')} />
        Keep me signed in on this device
      </label>

      <button type="submit" className="btn-primary w-full" disabled={submitting}>
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>

      <p className="text-center text-sm text-slate-400">
        Don&rsquo;t have an account?{' '}
        <Link to="/register" className="text-brand-400 hover:text-brand-300">
          Create one
        </Link>
      </p>
    </form>
  );
};
