import React, { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'stayornay:saved';
const SavedContext = createContext(null);

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {
    // ignore malformed storage
  }
  // Seed with one villa so the Saved tab isn't empty on first visit.
  return new Set(['oliveto']);
}

export function SavedProvider({ children }) {
  const [saved, setSaved] = useState(loadInitial);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...saved]));
  }, [saved]);

  const toggleSave = (id) =>
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  return (
    <SavedContext.Provider value={{ saved, toggleSave }}>
      {children}
    </SavedContext.Provider>
  );
}

export function useSaved() {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error('useSaved must be used within a SavedProvider');
  return ctx;
}
