"use client";

import { useState } from "react";
import { useUnit } from "effector-react";
import { LuMail, LuCalendar, LuPencil, LuSave, LuX } from "react-icons/lu";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { $user } from "@/lib/effector";
import { initialsFromName } from "@/lib/data/feed";

type EditableField = 'name' | 'bio' | 'location' | 'website' | null;

export function ProfileShell() {
  const [user] = useUnit([$user]);
  const [editingField, setEditingField] = useState<EditableField>(null);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    bio: '',
    location: '',
    website: '',
  });

  const handleEdit = (field: EditableField) => {
    setEditingField(field);
  };

  const handleSave = () => {
    // TODO: Implement save functionality
    setEditingField(null);
  };

  const handleCancel = () => {
    setEditingField(null);
    setFormData({
      name: user?.name || '',
      bio: '',
      location: '',
      website: '',
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!user) {
    return (
      <DashboardLayout hero={{ title: "Профиль", description: "Управление вашим профилем в Собрании" }}>
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 text-center backdrop-blur-2xl">
          <p className="text-dawn/60">Загрузка...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout hero={{ title: "Профиль", description: "Управление вашим профилем в Собрании" }}>
      {/* Main Profile Card */}
      <section className="rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur-2xl">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-tr from-accent-purple/70 via-accent-teal/60 to-accent-amber/50 text-2xl font-bold text-white shadow-neon">
              {initialsFromName(user.name || user.email)}
              <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/20" />
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1 space-y-6">
            {/* Name */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase tracking-[0.25em] text-dawn/60">Имя</label>
                {editingField !== 'name' && (
                  <button
                    onClick={() => handleEdit('name')}
                    className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-dawn/60 transition hover:border-accent-teal/50 hover:text-white"
                  >
                    <LuPencil className="h-3 w-3" />
                    изменить
                  </button>
                )}
              </div>
              {editingField === 'name' ? (
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="flex-1 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-white outline-none transition focus:border-accent-teal"
                  />
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 rounded-full border border-accent-teal/50 bg-accent-teal/10 px-3 py-1 text-xs text-accent-teal transition hover:bg-accent-teal/20"
                  >
                    <LuSave className="h-3 w-3" />
                    сохранить
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-dawn/60 transition hover:border-red-500/50 hover:text-red-300"
                  >
                    <LuX className="h-3 w-3" />
                    отмена
                  </button>
                </div>
              ) : (
                <h1 className="mt-2 text-2xl font-semibold text-white">{user.name || 'Не указано'}</h1>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="text-xs uppercase tracking-[0.25em] text-dawn/60">Email</label>
              <div className="mt-2 flex items-center gap-2 text-dawn/70">
                <LuMail className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
            </div>

            {/* Registration Date */}
            <div>
              <label className="text-xs uppercase tracking-[0.25em] text-dawn/60">Дата регистрации</label>
              <div className="mt-2 flex items-center gap-2 text-dawn/70">
                <LuCalendar className="h-4 w-4" />
                <span>{new Date(user.created_at).toLocaleDateString('ru-RU')}</span>
              </div>
            </div>

            {/* Role Badge */}
            <div>
              <label className="text-xs uppercase tracking-[0.25em] text-dawn/60">Роль</label>
              <div className="mt-2">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                  user.role === 'admin' ? 'bg-accent-purple/20 text-accent-purple' :
                  user.role === 'moderator' ? 'bg-accent-amber/20 text-accent-amber' :
                  'bg-accent-teal/20 text-accent-teal'
                }`}>
                  {user.role === 'admin' ? 'администратор' :
                   user.role === 'moderator' ? 'модератор' :
                   'пользователь'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Profile Sections */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Bio Section */}
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">О себе</h2>
            {editingField !== 'bio' && (
              <button
                onClick={() => handleEdit('bio')}
                className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-dawn/60 transition hover:border-accent-teal/50 hover:text-white"
              >
                <LuPencil className="h-3 w-3" />
                изменить
              </button>
            )}
          </div>

          {editingField === 'bio' ? (
            <div className="mt-4 space-y-3">
              <textarea
                value={formData.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
                rows={4}
                placeholder="Расскажите о себе..."
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-accent-teal resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 rounded-full border border-accent-teal/50 bg-accent-teal/10 px-3 py-1 text-xs text-accent-teal transition hover:bg-accent-teal/20"
                >
                  <LuSave className="h-3 w-3" />
                  сохранить
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-dawn/60 transition hover:border-red-500/50 hover:text-red-300"
                >
                  <LuX className="h-3 w-3" />
                  отмена
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              {formData.bio ? (
                <p className="text-dawn/70">{formData.bio}</p>
              ) : (
                <p className="text-dawn/50 italic">Расскажите о себе...</p>
              )}
            </div>
          )}
        </section>

        {/* Stats Section */}
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
          <h2 className="text-xl font-semibold text-white">Статистика</h2>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-center">
              <div className="text-2xl font-bold text-accent-teal">0</div>
              <div className="text-xs text-dawn/60">постов</div>
            </div>
            <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-center">
              <div className="text-2xl font-bold text-accent-purple">0</div>
              <div className="text-xs text-dawn/60">кругов</div>
            </div>
            <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-center">
              <div className="text-2xl font-bold text-accent-amber">0</div>
              <div className="text-xs text-dawn/60">подписчиков</div>
            </div>
            <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-center">
              <div className="text-2xl font-bold text-white">0</div>
              <div className="text-xs text-dawn/60">подписок</div>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}