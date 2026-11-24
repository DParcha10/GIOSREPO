import { create } from 'zustand';
import { SHOWCASE } from '../showcase';
import { postAgentChat, getAlertStreamUrl } from '../api/giosApi';

const STORAGE_KEY_MESSAGES = 'gios_jarvis_messages';
const STORAGE_KEY_MEMORY = 'gios_jarvis_memory';
const STORAGE_KEY_MARKS = 'gios_jarvis_marked_locations';

const DEFAULT_WELCOME = {
  id: 'jarvis-welcome',
  role: 'assistant',
  content: "Ask about a site, a gauge or a measurement. I can pin places on the map and open other pages for you.\n\nI need a language model running on the server (Ollama by default). Without one, I can't answer.",
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
      content: "Hello, my name is Assistant. I've cleared the active chat transcript, but I still retain my core memory notes. What would you like to inspect next?",
      toolCalls: [],
      timestamp: 'Just now'
    }];
    set({ messages: reset });
    saveStored(STORAGE_KEY_MESSAGES, reset);
  },

  // Initialize Server-Sent Events listener for Proactive Alerts
  initSSE: () => {
    if (get().sseConnected || SHOWCASE) return; // already connected, or no server
    const sse = new EventSource(getAlertStreamUrl(), { withCredentials: true });
    
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

  // Send message to Assistant with autonomous action execution
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

      const data = await postAgentChat(text, historyPayload, get().activeEventId);

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
        // Smooth auto-switch after a brief delay so the user sees Assistant respond
        setTimeout(() => {
          navigateFn(target);
        }, 1200);
      }

    } catch (err) {
      console.error('Assistant chat error:', err);
      const errMsg = {
        id: `jarvis-err-${Date.now()}`,
        role: 'assistant',
        content: "Hello, my name is Assistant. I apologize, but I encountered an issue connecting to our telemetry services. Please ensure the backend is running.",
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
