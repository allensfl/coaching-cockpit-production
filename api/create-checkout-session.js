// /api/create-checkout-session.js
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { coachId, email } = req.body;

        if (!coachId || !email) {
            return res.status(400).json({ 
                error: 'Coach ID und Email sind erforderlich' 
            });
        }

        console.log('🎯 Erstelle Stripe Checkout Session für Coach:', coachId);

        // Coach-Daten aus Supabase holen
        const { data: coach, error: coachError } = await supabase
            .from('coaches')
            .select('*')
            .eq('id', coachId)
            .single();

        if (coachError || !coach) {
            return res.status(404).json({ 
                error: 'Coach nicht gefunden' 
            });
        }

        // Stripe Customer erstellen oder finden
        let customer;
        try {
            const customers = await stripe.customers.list({
                email: email,
                limit: 1
            });

            if (customers.data.length > 0) {
                customer = customers.data[0];
                console.log('✅ Bestehender Stripe Customer gefunden:', customer.id);
            } else {
                customer = await stripe.customers.create({
                    email: email,
                    name: `${coach.first_name} ${coach.last_name}`,
                    metadata: {
                        coach_id: coachId,
                        source: 'coaching_cockpit'
                    }
                });
                console.log('✅ Neuer Stripe Customer erstellt:', customer.id);
            }
        } catch (error) {
            console.error('❌ Fehler beim Customer-Management:', error);
            return res.status(500).json({ 
                error: 'Fehler beim Customer-Management' 
            });
        }

        // Stripe Checkout Session erstellen
        const session = await stripe.checkout.sessions.create({
            customer: customer.id,
            payment_method_types: ['card', 'sepa_debit'],
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: 'Coaching Cockpit Pro',
                            description: 'KI-gestütztes Ruhestandscoaching für Coaches',
                            images: ['https://coaching-cockpit-live-v2.vercel.app/logo.png'],
                        },
                        uunit_amount: process.env.STRIPE_PRICE_AMOUNT || 100, // Dynamic pricing
                        recurring: {
                            interval: 'month',
                        },
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            subscription_data: {
                trial_period_days: 14, // 14-Tage kostenlose Testphase
                metadata: {
                    coach_id: coachId,
                    coach_name: `${coach.first_name} ${coach.last_name}`,
                    source: 'coaching_cockpit'
                }
            },
            success_url: `${req.headers.origin}/coach-dashboard.html?session_id={CHECKOUT_SESSION_ID}&success=true`,
            cancel_url: `${req.headers.origin}/coach-dashboard.html?canceled=true`,
            metadata: {
                coach_id: coachId,
                source: 'coaching_cockpit'
            }
        });

        console.log('✅ Stripe Checkout Session erstellt:', session.id);

        // Optional: Session-Info in Supabase speichern
        try {
            await supabase
                .from('coaches')
                .update({ 
                    stripe_customer_id: customer.id,
                    last_checkout_session: session.id,
                    updated_at: new Date().toISOString()
                })
                .eq('id', coachId);

            console.log('✅ Coach-Daten mit Stripe-Info aktualisiert');
        } catch (updateError) {
            console.error('⚠️ Warnung: Coach-Update fehlgeschlagen:', updateError);
            // Nicht kritisch, Session trotzdem zurückgeben
        }

        return res.status(200).json({
            success: true,
            sessionId: session.id,
            url: session.url,
            customer: customer.id
        });

    } catch (error) {
        console.error('❌ Stripe Checkout Error:', error);
        return res.status(500).json({ 
            error: 'Fehler beim Erstellen der Checkout-Session',
            details: error.message 
        });
    }
}