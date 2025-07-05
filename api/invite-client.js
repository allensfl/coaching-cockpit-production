// api/invite-client.js - Klient-Einladungs-API
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  console.log('🎯 Client invitation API called');
  
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    console.log('⚡ OPTIONS request');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📝 Processing client invitation data...');
    const { 
      clientFirstName,
      clientLastName, 
      clientEmail, 
      clientPhone,
      clientAge,
      clientSituation,
      coachingGoals,
      personalMessage
    } = req.body;

    console.log('📧 Client email to invite:', clientEmail);

    // Validierung
    if (!clientFirstName || !clientLastName || !clientEmail) {
      console.log('❌ Validation failed - missing required fields');
      return res.status(400).json({ 
        error: 'Vorname, Nachname und Email sind erforderlich' 
      });
    }

    // Email-Format prüfen
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientEmail)) {
      console.log('❌ Invalid email format');
      return res.status(400).json({ 
        error: 'Bitte geben Sie eine gültige Email-Adresse ein' 
      });
    }

    console.log('✅ Validation passed');

    // TODO: Coach ID aus Session/Auth holen
    // Für jetzt nehmen wir den ersten Coach aus der DB
    console.log('🔍 Finding coach...');
    const { data: coach, error: coachError } = await supabase
      .from('coaches')
      .select('id, first_name, last_name, email')
      .limit(1)
      .single();

    if (coachError || !coach) {
      console.error('❌ Coach not found:', coachError);
      return res.status(404).json({ 
        error: 'Coach nicht gefunden' 
      });
    }

    console.log('✅ Coach found:', coach.id);

    // Prüfen ob Client-Email bereits existiert
    console.log('🔍 Checking if client email exists...');
    const { data: existingClient } = await supabase
      .from('clients')
      .select('email')
      .eq('email', clientEmail)
      .single();

    if (existingClient) {
      console.log('❌ Client email already exists');
      return res.status(409).json({ 
        error: 'Ein Klient mit dieser Email-Adresse existiert bereits' 
      });
    }

    console.log('✅ Client email is unique');

    // Client in Datenbank erstellen
    console.log('💾 Creating client in database...');
    const { data: newClient, error: dbError } = await supabase
      .from('clients')
      .insert([
        {
          coach_id: coach.id,
          first_name: clientFirstName,
          last_name: clientLastName,
          email: clientEmail,
          phone: clientPhone || null,
          age: clientAge ? parseInt(clientAge) : null,
          situation: clientSituation || null,
          coaching_goals: coachingGoals || null,
          personal_message: personalMessage || null,
          status: 'invited',
          created_at: new Date().toISOString()
        }
      ])
      .select(`
        *,
        coaches:coach_id (
          first_name,
          last_name,
          email
        )
      `)
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      return res.status(500).json({ 
        error: 'Klient-Einladung fehlgeschlagen',
        details: dbError.message 
      });
    }

    console.log('✅ Client created successfully:', newClient.id);

    // Invitation Link generieren
    const invitationLink = `https://coaching-cockpit-live-v2.vercel.app/client-dashboard.html?token=${newClient.invitation_token}`;
    console.log('🔗 Invitation link generated:', invitationLink);

    // EMAIL SENDING LOGIC (später aktivieren wenn Email funktioniert)
    console.log('📧 EMAIL SENDING CURRENTLY DISABLED');
    /*
    try {
      console.log('📧 Sending invitation email...');
      const emailResponse = await fetch(`${req.headers.origin}/api/send-client-invitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientEmail: clientEmail,
          clientName: `${clientFirstName} ${clientLastName}`,
          coachName: `${coach.first_name} ${coach.last_name}`,
          coachEmail: coach.email,
          personalMessage: personalMessage,
          sessionLink: invitationLink
        })
      });

      const emailResult = await emailResponse.json();
      console.log('📧 Email result:', emailResult);
    } catch (emailError) {
      console.error('❌ Email error (non-blocking):', emailError);
    }
    */
    
    console.log('🎯 Sending success response...');
    
    return res.status(201).json({ 
      success: true, 
      message: 'Klient erfolgreich eingeladen!',
      data: {
        client: {
          id: newClient.id,
          firstName: newClient.first_name,
          lastName: newClient.last_name,
          email: newClient.email,
          phone: newClient.phone,
          age: newClient.age,
          situation: newClient.situation,
          status: newClient.status,
          invitationToken: newClient.invitation_token,
          createdAt: newClient.created_at
        },
        coach: {
          firstName: newClient.coaches.first_name,
          lastName: newClient.coaches.last_name,
          email: newClient.coaches.email
        },
        invitationLink: invitationLink,
        emailSent: false // später auf true wenn Email funktioniert
      }
    });

  } catch (error) {
    console.error('❌ MAIN ERROR:', error);
    console.error('❌ Error stack:', error.stack);
    return res.status(500).json({ 
      error: 'Ein unerwarteter Fehler ist aufgetreten',
      details: error.message 
    });
  }
}