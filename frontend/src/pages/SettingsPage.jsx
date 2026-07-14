import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { userService } from '../services/userService.js';
import { blockService } from '../services/blockService.js';
import { uploadService } from '../services/uploadService.js';
import { Avatar } from '../components/common/Avatar.jsx';
import { QUERY_KEYS } from '../utils/constants.js';

export const SettingsPage = () => {
  const { user, patchMe, logoutAll } = useAuth();
  const { theme, toggle } = useTheme();
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { username: user?.username ?? '', bio: user?.bio ?? '' },
  });

  const {
    register: registerPwd,
    handleSubmit: handleSubmitPwd,
    reset: resetPwd,
    formState: { isSubmitting: isSubmittingPwd },
  } = useForm();

  const { data: blocked } = useQuery({
    queryKey: QUERY_KEYS.BLOCKED,
    queryFn: () => blockService.list(),
  });

  const unblockMutation = useMutation({
    mutationFn: (id) => blockService.unblock(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BLOCKED }),
  });

  const [uploading, setUploading] = useState(false);

  const onProfile = async (values) => {
    try {
      const next = await userService.updateProfile(values);
      patchMe(next);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err?.response?.data?.error?.message ?? 'Update failed');
    }
  };

  const onChangePassword = async (values) => {
    try {
      await userService.changePassword(values);
      resetPwd();
      toast.success('Password changed. You may be signed out on other devices.');
    } catch (err) {
      toast.error(err?.response?.data?.error?.message ?? 'Change failed');
    }
  };

  const onPickAvatar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const media = await uploadService.uploadToCloudinary(file);
      const next = await userService.updateProfile({ avatarUrl: media.secureUrl });
      patchMe(next);
      toast.success('Avatar updated');
    } catch (err) {
      toast.error(err?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <h1 className="text-2xl font-semibold text-slate-100">Settings</h1>

      <section className="card p-6">
        <div className="flex items-center gap-4">
          <Avatar user={user} size="xl" />
          <div>
            <p className="text-base font-semibold text-slate-100">{user?.username}</p>
            <p className="text-sm text-slate-400">{user?.email}</p>
            <label className="btn-ghost mt-2 inline-flex cursor-pointer">
              {uploading ? 'Uploading…' : 'Change avatar'}
              <input hidden type="file" accept="image/*" onChange={onPickAvatar} />
            </label>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase text-slate-400">Profile</h2>
        <form onSubmit={handleSubmit(onProfile)} className="space-y-4">
          <div>
            <label className="field-label" htmlFor="username">Username</label>
            <input id="username" className="input" {...register('username')} />
          </div>
          <div>
            <label className="field-label" htmlFor="bio">Bio</label>
            <textarea id="bio" rows={3} className="input" {...register('bio')} />
          </div>
          <button className="btn-primary" disabled={isSubmitting}>Save changes</button>
        </form>
      </section>

      <section className="card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase text-slate-400">Security</h2>
        <form onSubmit={handleSubmitPwd(onChangePassword)} className="space-y-4">
          <div>
            <label className="field-label">Current password</label>
            <input type="password" className="input" {...registerPwd('currentPassword', { required: true })} />
          </div>
          <div>
            <label className="field-label">New password</label>
            <input type="password" className="input" {...registerPwd('newPassword', { required: true })} />
          </div>
          <button className="btn-primary" disabled={isSubmittingPwd}>Change password</button>
        </form>
        <div className="mt-6">
          <button
            className="btn-ghost text-rose-300 hover:text-rose-200"
            onClick={() => {
              if (window.confirm('Sign out of every device?')) logoutAll();
            }}
          >
            Log out everywhere
          </button>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase text-slate-400">Preferences</h2>
        <button className="btn-ghost" onClick={toggle}>
          Theme: {theme === 'dark' ? 'Dark' : 'Light'}
        </button>
      </section>

      <section className="card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase text-slate-400">Blocked users</h2>
        {!blocked || blocked.length === 0 ? (
          <p className="text-sm text-slate-500">No one is blocked.</p>
        ) : (
          <ul className="space-y-2">
            {blocked.map((row) => (
              <li key={row.user.id} className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-2">
                <div className="flex items-center gap-3">
                  <Avatar user={row.user} size="sm" />
                  <span className="text-sm text-slate-100">{row.user.username}</span>
                </div>
                <button
                  className="btn-ghost text-xs"
                  onClick={() => unblockMutation.mutate(row.user.id)}
                >
                  Unblock
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
