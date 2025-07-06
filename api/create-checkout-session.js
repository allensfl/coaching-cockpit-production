// /api/create-checkout-session.js
// Neue, saubere Stripe Payment Integration

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { coachData } = req.body;
    
    console.log('Payment request received:', coachData);

    // Validation
    if (!coachData || !coachData.email || !coachData.first_name) {
      return res.status(400).json({ 
        error: 'Missing coach data: email and first_name required' 
      });
    }

    // Check if coach already exists
    const { data: existingCoach, error: coachError } = await supabase
      .from('coaches')
      .select('*')
      .eq('email', coachData.email)
      .single();

    let coach = existingCoach;

    // Create new coach if doesn't exist
    if (!existingCoach) {
      console.log('Creating new coach:', coachData.email);
      
      const { data: newCoach, error: createError } = await supabase
        .from('coaches')
        .insert({
          email: coachData.email,
          first_name: coachData.first_name,
          last_name: coachData.last_name || '',
          phone: coachData.phone || '',
          specialization: coachData.specialization || '',
          subscription_status: 'trial',
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating coach:', createError);
        return res.status(500).json({ error: 'Failed to create coach account' });
      }

      coach = newCoach;
      console.log('New coach created:', coach.id);
    }

    // Create or retrieve Stripe customer
    let stripeCustomer;
    
    if (coach.stripe_customer_id) {
      // Retrieve existing customer
      try {
        stripeCustomer = await stripe.customers.retrieve(coach.stripe_customer_id);
      } catch (stripeError) {
        console.log('Stripe customer not found, creating new one');
        stripeCustomer = null;
      }
    }

    if (!stripeCustomer) {
      // Create new Stripe customer
      console.log('Creating new Stripe customer for:', coach.email);
      
      stripeCustomer = await stripe.customers.create({
        email: coach.email,
        name: `${coach.first_name} ${coach.last_name}`.trim(),
        phone: coach.phone || undefined,
        metadata: {
          coach_id: coach.id,
          environment: process.env.NODE_ENV || 'development'
        }
      });

      // Update coach with Stripe customer ID
      await supabase
        .from('coaches')
        .update({ 
          stripe_customer_id: stripeCustomer.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', coach.id);

      console.log('Stripe customer created:', stripeCustomer.id);
    }

    // Get Price ID from environment
    const priceId = process.env.STRIPE_PRICE_ID;
    
    if (!priceId) {
      console.error('STRIPE_PRICE_ID not configured');
      return res.status(500).json({ error: 'Payment configuration error' });
    }

    console.log('Using Price ID:', priceId);

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer.id,
      payment_method_types: ['card', 'sepa_debit'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin}/coach-dashboard.html?session_id={CHECKOUT_SESSION_ID}&coach_id=${coach.id}`,
      cancel_url: `${req.headers.origin}/coach-registration.html?canceled=true`,
      metadata: {
        coach_id: coach.id,
        coach_email: coach.email,
        environment: process.env.NODE_ENV || 'development'
      },
      subscription_data: {
        metadata: {
          coach_id: coach.id,
          coach_email: coach.email
        }
      },
      customer_update: {
        address: 'auto',
        name: 'auto'
      },
      automatic_tax: {
        enabled: true
      }
    });

    console.log('Checkout session created:', session.id);

    // Update coach with session info
    await supabase
      .from('coaches')
      .update({ 
        checkout_session_id: session.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', coach.id);

    // Return success response
    return res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
      coachId: coach.id,
      customerId: stripeCustomer.id
    });

  } catch (error) {
    console.error('Payment API Error:', error);
    
    // Return user-friendly error
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ 
        error: 'Stripe configuration error: ' + error.message 
      });
    }
    
    return res.status(500).json({ 
      error: 'Payment processing failed. Please try again.' 
    });
  }
}

// Helper function to generate trial end date
function getTrialEndDate(days = 14) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

// Helper function to validate coach data
function validateCoachData(data) {
  const required = ['email', 'first_name'];
  const missing = required.filter(field => !data[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    throw new Error('Invalid email format');
  }
  
  return true;
}