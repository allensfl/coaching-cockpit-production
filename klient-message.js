// api/klient-message.js - OPTIMIERT FÜR CHAT-SYNCHRONISATION
let allMessages = []; // Globaler Message Store

export default async function handler(req, res) {
  console.log('💬 Chat-Sync API called - Method:', req.method);
  
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    // Coach/Klient sendet Message für Synchronisation
    const { sessionId, message, timestamp, type } = req.body;
    
    console.log('📨 Sync message received:', {
      sessionId,
      type: type || 'COACHEE',
      message: message?.substring(0, 50),
      timestamp
    });

    if (!sessionId || !message) {
      return res.status(400).json({ 
        error: 'sessionId and message required' 
      });
    }

    // Message zu globalem Store hinzufügen
    const syncMessage = {
      id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5),
      type: type || 'COACHEE', // 'COACHEE' für Klient-Nachrichten, 'AI_RESPONSE' für KI-Antworten
      content: message,
      timestamp: timestamp || new Date().toISOString(),
      sessionId: sessionId,
      delivered: false // WICHTIG: Noch nicht an Empfänger delivered
    };

    allMessages.push(syncMessage);
    
    console.log('✅ Sync message stored. Total messages:', allMessages.length);
    console.log('📊 Message details:', {
      id: syncMessage.id,
      type: syncMessage.type,
      content: syncMessage.content.substring(0, 30),
      delivered: syncMessage.delivered
    });
    
    return res.status(200).json({
      success: true,
      message: 'Sync message stored successfully',
      sessionId: sessionId,
      messageId: syncMessage.id,
      type: syncMessage.type
    });
  }

  if (req.method === 'GET') {
    const { type, sessionId, limit } = req.query;
    
    if (type === 'coach_poll') {
      // Klient-Interface pollt nach neuen Messages vom Coach
      console.log('📥 Klient polling for new messages...');
      console.log('📊 Current message store:', allMessages.length, 'total messages');
      
      // Finde undelivered Messages
      const undeliveredMessages = allMessages.filter(msg => !msg.delivered);
      console.log('📋 Undelivered messages found:', undeliveredMessages.length);
      
      if (undeliveredMessages.length > 0) {
        // Markiere als delivered
        undeliveredMessages.forEach(msg => {
          msg.delivered = true;
        });
        
        console.log('✅ Delivering', undeliveredMessages.length, 'messages to klient');
        console.log('📤 Message types:', undeliveredMessages.map(m => `${m.type}: ${m.content.substring(0, 30)}`));
        
        return res.status(200).json({
          success: true,
          messages: undeliveredMessages.map(msg => ({
            id: msg.id,
            type: msg.type,
            content: msg.content,
            timestamp: msg.timestamp,
            sessionId: msg.sessionId
          })),
          totalMessages: allMessages.length,
          deliveredCount: undeliveredMessages.length
        });
      } else {
        console.log('📭 No new messages for klient');
        return res.status(200).json({
          success: true,
          messages: [],
          totalMessages: allMessages.length,
          deliveredCount: 0
        });
      }
    }
    
    if (type === 'history') {
      // Get message history (optional feature)
      console.log('📚 History request for session:', sessionId);
      
      let historyMessages = allMessages;
      
      if (sessionId) {
        historyMessages = allMessages.filter(msg => msg.sessionId === sessionId);
      }
      
      if (limit) {
        const limitNum = parseInt(limit);
        historyMessages = historyMessages.slice(-limitNum);
      }
      
      return res.status(200).json({
        success: true,
        messages: historyMessages.map(msg => ({
          id: msg.id,
          type: msg.type,
          content: msg.content,
          timestamp: msg.timestamp,
          sessionId: msg.sessionId,
          delivered: msg.delivered
        })),
        totalMessages: historyMessages.length
      });
    }
    
    if (type === 'stats') {
      // API Statistics (für Debugging)
      const stats = {
        totalMessages: allMessages.length,
        deliveredMessages: allMessages.filter(msg => msg.delivered).length,
        pendingMessages: allMessages.filter(msg => !msg.delivered).length,
        messageTypes: {
          coachee: allMessages.filter(msg => msg.type === 'COACHEE').length,
          ai_response: allMessages.filter(msg => msg.type === 'AI_RESPONSE').length
        },
        sessionsActive: [...new Set(allMessages.map(msg => msg.sessionId))].length
      };
      
      console.log('📊 API Stats requested:', stats);
      
      return res.status(200).json({
        success: true,
        stats: stats,
        timestamp: new Date().toISOString()
      });
    }
    
    // Standard GET ohne spezifischen type
    console.log('📥 Standard GET request');
    return res.status(200).json({
      success: true,
      messages: [],
      info: 'Chat-Sync API - Use ?type=coach_poll for polling, ?type=history for history, ?type=stats for statistics',
      totalMessages: allMessages.length
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// 🚀 ERWEITERTE UTILITY FUNCTIONS

// Message Store cleaner (verhindert memory leaks)
export function cleanupOldMessages(maxAge = 24 * 60 * 60 * 1000) { // 24 Stunden default
  const now = Date.now();
  const initialCount = allMessages.length;
  
  allMessages = allMessages.filter(msg => {
    const messageAge = now - new Date(msg.timestamp).getTime();
    return messageAge < maxAge;
  });
  
  const cleanedCount = initialCount - allMessages.length;
  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} old messages. Remaining: ${allMessages.length}`);
  }
  
  return cleanedCount;
}

// Get all messages (für debugging)
export const getAllMessages = () => allMessages;

// Reset message store (für testing)
export const resetMessageStore = () => {
  const count = allMessages.length;
  allMessages = [];
  console.log(`🔄 Message store reset. Removed ${count} messages.`);
  return count;
};

// Get session-specific messages
export const getSessionMessages = (sessionId) => {
  return allMessages.filter(msg => msg.sessionId === sessionId);
};