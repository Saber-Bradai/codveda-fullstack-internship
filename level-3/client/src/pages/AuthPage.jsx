import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Field } from '../components/ui';

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form);
      navigate('/');
    } catch (err) {
      setErrors(err.details || { _: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <form className="card auth-card stack" onSubmit={submit} noValidate>
        <div className="brand big"><span className="logo">✓</span> TaskFlow</div>
        <h1>{isLogin ? 'Welcome back' : 'Create your account'}</h1>
        <p className="muted">{isLogin ? 'Log in to your team board.' : 'Join the board — new accounts get the member role.'}</p>
        {errors._ && <div className="alert error">{errors._}</div>}
        {!isLogin && <Field label="Name" value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" required />}
        <Field label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" required />
        <Field
          label="Password"
          type="password"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          required
        />
        {!isLogin && <small className="muted">At least 8 characters, with a letter and a number.</small>}
        <Button variant="primary" type="submit" loading={loading}>{isLogin ? 'Log in' : 'Sign up'}</Button>
        <p className="muted center">
          {isLogin ? <>No account? <Link to="/register">Sign up</Link></> : <>Already registered? <Link to="/login">Log in</Link></>}
        </p>
      </form>
    </div>
  );
}
