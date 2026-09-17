import { create } from 'zustand';
import giosApi from '../api/giosApi';

const STORAGE_KEY_MESSAGES = 'gios_jarvis_messages';
const STORAGE_KEY_MEMORY = 'gios_jarvis_memory';
const STORAGE_KEY_MARKS = 'gios_jarvis_marked_locations';

const DEFAULT_WELCOME = {
  id: 'jarvis-welcome',
  role: 'assistant',
  content: "Hello, my name is JARVIS. I am your GIOS Autonomous Intelligence Copilot.\n\nI remember everything from our conversations and have autonomous control over your console. Whenever you ask about a hazard or location, I will mark it on your map and automatically switch you to the Map view. You can also ask me to jump to Telemetry, Analytics, or Methodology at any time.\n\nWhat would you like me to inspect or mark for you?",
  toolCalls: [],
  timestamp: 'Just now'
};

function loadStored(key, defaultVal) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function saveStored(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.warn('Storage save failed:', e);
  }
}

export const useJarvisStore = create((set, get) => ({
  messages: loadStored(STORAGE_KEY_MESSAGES, [DEFAULT_WELCOME]),
  memoryNotes: loadStored(STORAGE_KEY_MEMORY, []),
  markedLocations: loadStored(STORAGE_KEY_MARKS, []),
  flyToTarget: null, // { lat, lng, zoom, label }
  activeEventId: null,
  loading: false,

  // Add a marker on the map
  addMarkedLocation: (mark) => {
    const existing = get().markedLocations;
    const updated = [
      ...existing.filter(m => m.label !== mark.label),
      {
        id: `mark-${Date.now()}`,
        lat: mark.lat,
        lng: mark.lng,
        zoom: mark.zoom || 14,
        label: mark.label,
        eventId: mark.event_id || null,
        color: mark.color || 'var(--color-primary)',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    set({ 
      markedLocations: updated,
      flyToTarget: { lat: mark.lat, lng: mark.lng, zoom: mark.zoom || 14, label: mark.label },
      activeEventId: mark.event_id || get().activeEventId
    });
    saveStored(STORAGE_KEY_MARKS, updated);
  },

  clearMarkedLocations: () => {
    set({ markedLocations: [], flyToTarget: null });
    saveStored(STORAGE_KEY_MARKS, []);
  },

  clearChat: () => {
    const reset = [{
      id: `reset-${Date.now()}`,
      role: 'assistant',
      content: "Hello, my name is JARVIS. I've cleared the active chat transcript, but I still retain my core memory notes. What would you like to inspect next?",
      toolCalls: [],
      timestamp: 'Just now'
    }];
    set({ messages: reset });
    saveStored(STORAGE_KEY_MESSAGES, reset);
  },

  // Initialize Server-Sent Events listener for Proactive Alerts
  initSSE: () => {
    if (get().sseConnected) return; // already connected
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const sse = new EventSource(`${baseUrl}/api/v1/agent/stream-alerts`);
    
    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'jarvis_proactive_alert') {
          // Push new alert to chat
          const alertMsg = {
            id: `jarvis-alert-${Date.now()}`,
            role: 'assistant',
            content: data.message,
            toolCalls: [],
            isProactiveAlert: true,
            alertData: data.data,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          const updatedMessages = [...get().messages, alertMsg];
          set({ messages: updatedMessages });
          saveStored(STORAGE_KEY_MESSAGES, updatedMessages);
        }
      } catch (err) {
        console.error("SSE parse error", err);
      }
    };
    
    set({ sseConnected: true });
    
    return () => {
      sse.close();
      set({ sseConnected: false });
    };
  },

  // Send message to JARVIS with autonomous action execution
  sendMessage: async (queryText, navigateFn = null) => {
    const text = queryText.trim();
    if (!text || get().loading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const currentMessages = [...get().messages, userMsg];
    set({ messages: currentMessages, loading: true });
    saveStored(STORAGE_KEY_MESSAGES, currentMessages);

    try {
      const historyPayload = currentMessages.slice(-8).map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await giosApi.post('/api/v1/agent/chat', {
        message: text,
        history: historyPayload,
        event_id: get().activeEventId
      });

      const data = res.data;

      // Check for Memory Updates
      if (data.memory_updates && data.memory_updates.length > 0) {
        const existing = get().memoryNotes || [];
        const fresh = data.memory_updates.filter(u => !existing.includes(u));
        if (fresh.length > 0) {
          const newNotes = [...existing, ...fresh];
          set({ memoryNotes: newNotes });
          saveStored(STORAGE_KEY_MEMORY, newNotes);
        }
      }

      // Check for Map Marking Action
      if (data.map_action) {
        get().addMarkedLocation(data.map_action);
      }

      const botMsg = {
        id: `jarvis-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        toolCalls: data.tool_calls || [],
        mapAction: data.map_action || null,
        navigation: data.navigation || null,
        sources: data.sources || [],
        dataAnalysis: data.data_analysis || null,
        thinking: data.thinking || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const finalMessages = [...get().messages, botMsg];
      set({ messages: finalMessages, loading: false });
      saveStored(STORAGE_KEY_MESSAGES, finalMessages);

      // Autonomous Navigation Switch
      if (data.navigation && data.navigation.auto_switch && navigateFn) {
        const target = data.navigation.target_path;
        // Smooth auto-switch after a brief delay so the user sees JARVIS respond
        setTimeout(() => {
          navigateFn(target);
        }, 1200);
      }

    } catch (err) {
      console.error('JARVIS chat error:', err);
      const errMsg = {
        id: `jarvis-err-${Date.now()}`,
        role: 'assistant',
        content: "Hello, my name is JARVIS. I apologize, but I encountered an issue connecting to our telemetry services. Please ensure the backend is running.",
        toolCalls: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      const finalMessages = [...get().messages, errMsg];
      set({ messages: finalMessages, loading: false });
      saveStored(STORAGE_KEY_MESSAGES, finalMessages);
    }
  }
}));

export default useJarvisStore;
