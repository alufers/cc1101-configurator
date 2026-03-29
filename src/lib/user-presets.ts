import type { PresetData } from "./system-presets";

const STORAGE_KEY = "cc1101_user_presets";

export function loadUserPresets(): PresetData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PresetData[];
  } catch {
    return [];
  }
}

export function saveUserPresets(presets: PresetData[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function upsertUserPreset(preset: PresetData): PresetData[] {
  const presets = loadUserPresets();
  const idx = presets.findIndex((p) => p.id === preset.id);
  if (idx >= 0) {
    presets[idx] = preset;
  } else {
    presets.push(preset);
  }
  saveUserPresets(presets);
  return presets;
}

export function deleteUserPreset(id: string): PresetData[] {
  const presets = loadUserPresets().filter((p) => p.id !== id);
  saveUserPresets(presets);
  return presets;
}

export function generateUserPresetId(): string {
  return `user:${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
