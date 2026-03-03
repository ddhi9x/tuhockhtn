import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface UserProfile {
  name: string;
  grade: string;
  avatar: string;
}

export interface ExerciseResult {
  date: string;
  subject: string;
  grade: number;
  correct: number;
  total: number;
  timeSpent: number; // seconds
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  images?: string[];
}

export interface AppSettings {
  model: string;
}

export interface DailyActivity {
  date: string;
  theoryTime: number; // seconds
  exerciseCount: number;
  totalTime: number; // seconds
}

export interface AppState {
  profile: UserProfile;
  settings: AppSettings;
  chatHistory: ChatMessage[];
  exerciseResults: ExerciseResult[];
  dailyActivities: DailyActivity[];
  streak: number;
  lastActiveDate: string;
}

const defaultState: AppState = {
  profile: {
    name: 'Học sinh',
    grade: 'Lớp 8A1',
    avatar: '',
  },
  settings: {
    model: 'gemini-2.5-flash',
  },
  chatHistory: [],
  exerciseResults: [],
  dailyActivities: [],
  streak: 0,
  lastActiveDate: '',
};

interface AppContextType {
  state: AppState;
  updateProfile: (profile: Partial<UserProfile>) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  addChatMessage: (msg: ChatMessage) => void;
  updateChatMessage: (id: string, content: string) => void;
  clearChatHistory: () => void;
  addExerciseResult: (result: ExerciseResult) => void;
  updateDailyActivity: (activity: Partial<DailyActivity>) => void;
  getTodayActivity: () => DailyActivity;
  getWeekActivities: () => DailyActivity[];
}

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be inside AppProvider');
  return ctx;
};

const STORAGE_KEY = 'giasu-khtn-data';

const loadState = (): AppState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...defaultState, ...JSON.parse(saved) };
    }
  } catch {}
  return defaultState;
};

const saveState = (state: AppState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
};

const getToday = () => new Date().toISOString().split('T')[0];

const calculateStreak = (activities: DailyActivity[], lastActive: string): number => {
  if (!lastActive) return 0;
  const today = getToday();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  if (lastActive !== today && lastActive !== yesterday) return 0;
  
  let streak = lastActive === today ? 1 : 0;
  const sorted = [...activities]
    .filter(a => a.exerciseCount > 0 || a.theoryTime > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
  
  let checkDate = lastActive === today ? yesterday : lastActive;
  
  for (const act of sorted) {
    if (act.date === checkDate) {
      streak++;
      const prev = new Date(new Date(checkDate).getTime() - 86400000).toISOString().split('T')[0];
      checkDate = prev;
    }
  }
  
  return Math.max(streak, lastActive === today ? 1 : 0);
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AppState>(loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const updateProfile = (profile: Partial<UserProfile>) => {
    setState(prev => ({ ...prev, profile: { ...prev.profile, ...profile } }));
  };

  const updateSettings = (settings: Partial<AppSettings>) => {
    setState(prev => ({ ...prev, settings: { ...prev.settings, ...settings } }));
  };

  const addChatMessage = (msg: ChatMessage) => {
    setState(prev => ({ ...prev, chatHistory: [...prev.chatHistory, msg] }));
  };

  const updateChatMessage = (id: string, content: string) => {
    setState(prev => ({
      ...prev,
      chatHistory: prev.chatHistory.map(m => m.id === id ? { ...m, content } : m),
    }));
  };

  const clearChatHistory = () => {
    setState(prev => ({ ...prev, chatHistory: [] }));
  };

  const addExerciseResult = (result: ExerciseResult) => {
    setState(prev => ({ ...prev, exerciseResults: [...prev.exerciseResults, result] }));
  };

  const getTodayActivity = (): DailyActivity => {
    const today = getToday();
    return state.dailyActivities.find(a => a.date === today) || {
      date: today,
      theoryTime: 0,
      exerciseCount: 0,
      totalTime: 0,
    };
  };

  const getWeekActivities = (): DailyActivity[] => {
    const days: DailyActivity[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      const existing = state.dailyActivities.find(a => a.date === date);
      days.push(existing || { date, theoryTime: 0, exerciseCount: 0, totalTime: 0 });
    }
    return days;
  };

  const updateDailyActivity = (activity: Partial<DailyActivity>) => {
    const today = getToday();
    setState(prev => {
      const existing = prev.dailyActivities.find(a => a.date === today);
      const updated = existing
        ? { ...existing, ...activity }
        : { date: today, theoryTime: 0, exerciseCount: 0, totalTime: 0, ...activity };
      
      const activities = existing
        ? prev.dailyActivities.map(a => a.date === today ? updated : a)
        : [...prev.dailyActivities, updated];

      const streak = calculateStreak(activities, today);
      
      return { ...prev, dailyActivities: activities, streak, lastActiveDate: today };
    });
  };

  return (
    <AppContext.Provider value={{
      state,
      updateProfile,
      updateSettings,
      addChatMessage,
      updateChatMessage,
      clearChatHistory,
      addExerciseResult,
      updateDailyActivity,
      getTodayActivity,
      getWeekActivities,
    }}>
      {children}
    </AppContext.Provider>
  );
};
