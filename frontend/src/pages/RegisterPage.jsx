import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';

export const RegisterPage = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { username: '', email: '', password: '' } });

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      await registerUser(values);
      toast.success('Welcome to ChatApp');
      navigate('/chat', { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.error?.message ?? 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">Create your account</h2>
        <p className="mt-1 text-sm text-slate-400">Free forever. No credit card. E2E encrypted from day one.</p>
      </div>

      <div>
        <label className="field-label" htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          autoComplete="username"
          className="input"
          {...register('username', {
            required: 'Username is required',
            minLength: { value: 3, message: 'At least 3 characters' },
            pattern: { value: /^[a-zA-Z0-9_.]+$/, message: 'Only letters, digits, _ or .' },
          })}
        />
        {errors.username && <p className="field-error">{errors.username.message}</p>}
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
          autoComplete="new-password"
          className="input"
          {...register('password', {
            required: 'Password is required',
            minLength: { value: 8, message: 'At least 8 characters' },
            pattern: {
              value: /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/,
              message: 'Must include a letter and a digit',
            },
          })}
        />
        {errors.password && <p className="field-error">{errors.password.message}</p>}
      </div>

      <button type="submit" className="btn-primary w-full" disabled={submitting}>
        {submitting ? 'Creating account…' : 'Create account'}
      </button>

      <p className="text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-400 hover:text-brand-300">
          Sign in
        </Link>
      </p>
    </form>
  );
};
