// /api/coach-registration.js
// Sprint 2 Finalisierung - Echte Supabase Integration

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('🚀 Coach Registration API called');

  try {
    // Validate environment variables
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase environment variables');
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'Supabase environment variables not configured'
      });
    }

    // Extract registration data
    const {
      email,
      password,
      firstName,
      lastName,
      companyName = '',
      coachingExperience = 0,
      bio = '',
      phone = '',
      coachingStyle = 'balanced'
    } = req.body;

    console.log('📝 Registration attempt for:', email);

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        error: 'Pflichtfelder fehlen',
        details: 'Email, Passwort, Vor- und Nachname sind erforderlich'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Ungültige E-Mail-Adresse',
        details: 'Bitte geben Sie eine gültige E-Mail-Adresse ein'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Passwort zu schwach',
        details: 'Passwort muss mindestens 8 Zeichen lang sein'
      });
    }

    console.log('✅ Input validation passed');

    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm for now
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: 'coach'
      }
    });

    if (authError) {
      console.error('❌ Auth user creation failed:', authError);
      
      // Handle specific auth errors
      if (authError.message.includes('already registered')) {
        return res.status(409).json({
          error: 'E-Mail bereits registriert',
          details: 'Ein Account mit dieser E-Mail-Adresse existiert bereits'
        });
      }
      
      return res.status(500).json({
        error: 'Registrierung fehlgeschlagen',
        details: authError.message
      });
    }

    console.log('✅ Auth user created:', authData.user.id);

    // Step 2: Create coach profile
    const coachData = {
      user_id: authData.user.id,
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: phone,
      company_name: companyName,
      coaching_experience: parseInt(coachingExperience) || 0,
      bio: bio,
      coaching_style: coachingStyle,
      subscription_status: 'trial',
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
      onboarding_completed: false,
      timezone: 'Europe/Zurich',
      language: 'de'
    };

    const { data: coachProfile, error: profileError } = await supabase
      .from('coaches')
      .insert([coachData])
      .select()
      .single();

    if (profileError) {
      console.error('❌ Coach profile creation failed:', profileError);
      
      // Cleanup: Delete auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      
      return res.status(500).json({
        error: 'Profilerstellung fehlgeschlagen',
        details: profileError.message
      });
    }

    console.log('✅ Coach profile created:', coachProfile.id);

    // Step 3: Generate session for immediate login
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${process.env.VERCEL_URL || 'http://localhost:3000'}/coach-dashboard.html`
      }
    });

    if (sessionError) {
      console.warn('⚠️ Session generation failed, but registration successful:', sessionError);
    }

    console.log('🎉 Registration completed successfully');

    // Return success response
    return res.status(201).json({
      success: true,
      message: 'Registrierung erfolgreich!',
      data: {
        userId: authData.user.id,
        coachId: coachProfile.id,
        email: email,
        firstName: firstName,
        lastName: lastName,
        trialEndsAt: coachProfile.trial_ends_at,
        onboardingCompleted: coachProfile.onboarding_completed
      },
      redirectUrl: '/coach-dashboard.html', // Where to redirect after registration
      metadata: {
        timestamp: new Date().toISOString(),
        trialDays: 14
      }
    });

  } catch (error) {
    console.error('❌ Unexpected registration error:', error);
    
    return res.status(500).json({
      error: 'Unerwarteter Fehler bei der Registrierung',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Bitte versuchen Sie es später erneut',
      timestamp: new Date().toISOString()
    });
  }
}