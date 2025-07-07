// api/trial-management.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    return await createTrial(req, res);
  } else if (req.method === 'GET') {
    return await getTrialStatus(req, res);
  } else if (req.method === 'PUT') {
    return await updateTrialStatus(req, res);
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

// Erstelle neuen Trial
async function createTrial(req, res) {
  try {
    const { coach_id, email } = req.body;
    
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14); // 14 Tage Trial
    
    const { data, error } = await supabase
      .from('coach_trials')
      .insert([
        {
          coach_id: coach_id,
          email: email,
          trial_start: new Date().toISOString(),
          trial_end: trialEndDate.toISOString(),
          status: 'active',
          features_used: [],
          clients_created: 0,
          sessions_conducted: 0
        }
      ])
      .select();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      trial: data[0],
      message: 'Trial erfolgreich gestartet'
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Trial konnte nicht erstellt werden',
      details: error.message
    });
  }
}

// Prüfe Trial Status
async function getTrialStatus(req, res) {
  try {
    const { coach_id } = req.query;
    
    const { data, error } = await supabase
      .from('coach_trials')
      .select('*')
      .eq('coach_id', coach_id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    if (!data) {
      return res.status(200).json({
        trial_active: false,
        trial_expired: false,
        days_remaining: 0,
        features_available: getTrialFeatures()
      });
    }

    const now = new Date();
    const trialEnd = new Date(data.trial_end);
    const daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
    
    const isExpired = now > trialEnd;
    const isActive = data.status === 'active' && !isExpired;

    return res.status(200).json({
      trial_active: isActive,
      trial_expired: isExpired,
      days_remaining: Math.max(0, daysRemaining),
      trial_data: data,
      features_available: isActive ? getTrialFeatures() : {},
      limits: getTrialLimits()
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Trial Status konnte nicht abgerufen werden',
      details: error.message
    });
  }
}

// Update Trial (Conversion to Paid)
async function updateTrialStatus(req, res) {
  try {
    const { coach_id, status, plan_type } = req.body;
    
    const { data, error } = await supabase
      .from('coach_trials')
      .update({
        status: status, // 'converted', 'expired', 'cancelled'
        converted_to_plan: plan_type,
        conversion_date: status === 'converted' ? new Date().toISOString() : null
      })
      .eq('coach_id', coach_id)
      .select();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: 'Trial Status aktualisiert',
      trial: data[0]
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Trial konnte nicht aktualisiert werden',
      details: error.message
    });
  }
}

// Trial Feature Definitionen
function getTrialFeatures() {
  return {
    client_limit: 3,
    ai_sessions_limit: 10,
    document_uploads: true,
    basic_analytics: true,
    email_invitations: true,
    chat_history: true,
    progress_tracking: true,
    // Premium Features NICHT verfügbar
    advanced_analytics: false,
    unlimited_clients: false,
    white_label: false,
    priority_support: false
  };
}

function getTrialLimits() {
  return {
    max_clients: 3,
    max_ai_sessions_per_day: 5,
    max_documents_per_client: 5,
    max_chat_history_days: 14
  };
}

// Database Schema für Supabase:
/*
CREATE TABLE coach_trials (
  id SERIAL PRIMARY KEY,
  coach_id UUID REFERENCES coaches(id),
  email VARCHAR(255) NOT NULL,
  trial_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  trial_end TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'converted', 'cancelled'
  converted_to_plan VARCHAR(20), -- 'basic', 'professional', 'premium'
  conversion_date TIMESTAMP WITH TIME ZONE,
  features_used JSONB DEFAULT '[]',
  clients_created INTEGER DEFAULT 0,
  sessions_conducted INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_coach_trials_coach_id ON coach_trials(coach_id);
CREATE INDEX idx_coach_trials_status ON coach_trials(status);
*/