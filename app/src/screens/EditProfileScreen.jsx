import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Save, Check, Trash2, AlertCircle } from 'lucide-react';
import { Input, Button, Avatar } from '../components/core';
import { Header } from '../components/shared';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { convertHeicIfNeeded } from '../lib/compressMedia';

/**
 * Edit profile — display name + profile picture. The picture is optional:
 * without one the avatar keeps its initials "symbol" everywhere. Uploads go
 * to the existing review-media bucket under the user's own folder (the same
 * RLS policy that lets reviewers upload their photos), resized in-browser to
 * a small square JPEG first so avatars stay tiny and fast. iPhone HEIC
 * photos convert automatically. Name + picture are stored on the Supabase
 * account itself (user_metadata), so they follow the user everywhere.
 */
export function EditProfileScreen() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const meta = user?.user_metadata || {};
  const [displayName, setDisplayName] = useState(meta.display_name || meta.name || '');
  const [avatarUrl, setAvatarUrl] = useState(meta.avatar_url || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  if (!loading && !user) {
    return (
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-page)' }}>
        <Header title="Edit profile" onBack={() => navigate('/you')} />
        <div style={{ padding: 24, textAlign: 'center', fontFamily: 'var(--font-body)', color: 'var(--text-muted)' }}>
          Sign in first to edit your profile.
          <div style={{ marginTop: 14 }}>
            <Button variant="stay" onClick={() => navigate('/you/account')}>Sign in</Button>
          </div>
        </div>
      </div>
    );
  }

  // Downscale to a 512px square JPEG — plenty for an avatar, tiny to load.
  const toAvatarJpeg = async (file) => {
    const converted = await convertHeicIfNeeded(file);
    const bitmap = await createImageBitmap(converted);
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    const out = 512;
    const canvas = document.createElement('canvas');
    canvas.width = out;
    canvas.height = out;
    canvas.getContext('2d').drawImage(bitmap, sx, sy, side, side, 0, 0, out, out);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) throw new Error('Could not process that image — try a different one.');
    return new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
  };

  const handlePick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const jpeg = await toAvatarJpeg(file);
      const path = `${user.id}/avatar-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from('review-media').upload(path, jpeg, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('review-media').getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({
      data: { display_name: displayName.trim(), avatar_url: avatarUrl },
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-page)' }}>
      <Header title="Edit profile" onBack={() => navigate('/you')} />
      <div style={{ padding: 18, maxWidth: 480, width: '100%', margin: '0 auto', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Picture */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '18px 0 6px' }}>
          <div style={{ position: 'relative' }}>
            <Avatar src={avatarUrl} name={displayName || user?.email || ''} size={96} />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              aria-label="Add or change profile picture"
              style={{
                position: 'absolute', right: -4, bottom: -4,
                width: 36, height: 36, borderRadius: 'var(--radius-pill)',
                border: '2px solid var(--surface-page)', background: 'var(--brand)', color: '#fff',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                cursor: uploading ? 'wait' : 'pointer', boxShadow: 'var(--shadow-sm)',
              }}
            >
              <Camera size={17} />
            </button>
          </div>
          <input ref={inputRef} type="file" accept="image/*,.heic,.heif,image/heic,image/heif" onChange={handlePick} style={{ display: 'none' }} />
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
            {uploading ? 'Uploading…' : avatarUrl ? 'Looking good.' : 'Add a photo — or keep the initials, that works too.'}
          </div>
          {avatarUrl && (
            <button
              type="button"
              onClick={() => setAvatarUrl(null)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--danger)', padding: 0 }}
            >
              <Trash2 size={14} /> Remove picture
            </button>
          )}
        </div>

        {/* Name */}
        <Input
          label="Display name"
          placeholder="e.g. Benjamin"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <p style={{ margin: '-10px 0 0', fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-faint)' }}>
          Shown on your reviews — first name only appears publicly.
        </p>

        {error && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: 'var(--danger)' }}>
            <AlertCircle size={16} style={{ flex: 'none', marginTop: 2 }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13 }}>{error}</span>
          </div>
        )}

        <Button variant="stay" block disabled={saving || uploading} iconLeft={saved ? <Check size={16} /> : <Save size={16} />} onClick={save}>
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save profile'}
        </Button>
      </div>
    </div>
  );
}
