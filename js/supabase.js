// Supabase Client Configuration
const SUPABASE_URL = 'https://xbdtbgqimwpjpfxuzsxt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiZHRiZ3FpbXdwanBmeHV6c3h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5MDU4NjIsImV4cCI6MjA1MTQ4MTg2Mn0.3YpeaJfY6GqZUvAyH8gPuR1VfKHSl6pQwJ6kHl_JGfs';

// Import Supabase from CDN
const { createClient } = supabase;

// Initialize Supabase client
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Authentication Functions
class CoachingAuth {
    
    // Sign Up new user
    static async signUp(email, password, fullName, role = 'client') {
        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: fullName,
                        role: role
                    }
                }
            });

            if (error) throw error;

            // Also insert into our users table
            if (data.user) {
                const { error: insertError } = await supabaseClient
                    .from('users')
                    .insert([
                        {
                            id: data.user.id,
                            email: email,
                            full_name: fullName,
                            role: role,
                            created_at: new Date().toISOString()
                        }
                    ]);
                
                if (insertError) console.warn('User table insert failed:', insertError);
            }

            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    // Sign In existing user
    static async signIn(email, password) {
        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            // Update last login
            if (data.user) {
                await supabaseClient
                    .from('users')
                    .update({ last_login: new Date().toISOString() })
                    .eq('id', data.user.id);
            }

            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    // Sign Out
    static async signOut() {
        try {
            const { error } = await supabaseClient.auth.signOut();
            if (error) throw error;
            
            // Clear session storage
            sessionStorage.clear();
            
            return { error: null };
        } catch (error) {
            return { error };
        }
    }

    // Get current user
    static async getCurrentUser() {
        try {
            const { data: { user }, error } = await supabaseClient.auth.getUser();
            if (error) throw error;
            
            if (user) {
                // Get user details from our users table
                const { data: userData, error: userError } = await supabaseClient
                    .from('users')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                
                return { 
                    user: { ...user, ...userData }, 
                    error: null 
                };
            }
            
            return { user: null, error: null };
        } catch (error) {
            return { user: null, error };
        }
    }

    // Check if user is authenticated
    static async isAuthenticated() {
        const { user } = await this.getCurrentUser();
        return !!user;
    }

    // Get user role
    static async getUserRole() {
        const { user } = await this.getCurrentUser();
        return user?.role || null;
    }
}

// Session Management
class SessionManager {
    
    // Save coaching session
    static async saveSession(coachId, clientId, sessionData) {
        try {
            const { data, error } = await supabaseClient
                .from('coaching_sessions')
                .insert([
                    {
                        coach_id: coachId,
                        client_id: clientId,
                        current_phase: sessionData.currentPhase || 1,
                        session_data: sessionData,
                        started_at: new Date().toISOString(),
                        last_activity: new Date().toISOString()
                    }
                ])
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    // Update session
    static async updateSession(sessionId, sessionData) {
        try {
            const { data, error } = await supabaseClient
                .from('coaching_sessions')
                .update({
                    current_phase: sessionData.currentPhase,
                    session_data: sessionData,
                    last_activity: new Date().toISOString()
                })
                .eq('id', sessionId)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    // Get user sessions
    static async getUserSessions(userId) {
        try {
            const { data, error } = await supabaseClient
                .from('coaching_sessions')
                .select('*')
                .or(`coach_id.eq.${userId},client_id.eq.${userId}`)
                .order('last_activity', { ascending: false });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }
}

// Message Storage
class MessageManager {
    
    // Save chat message
    static async saveMessage(sessionId, senderId, content, messageType = 'text') {
        try {
            const { data, error } = await supabaseClient
                .from('messages')
                .insert([
                    {
                        session_id: sessionId,
                        sender_id: senderId,
                        content: content,
                        message_type: messageType,
                        created_at: new Date().toISOString()
                    }
                ]);

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    // Get session messages
    static async getMessages(sessionId) {
        try {
            const { data, error } = await supabaseClient
                .from('messages')
                .select('*')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }
}

// Export for use in other files
window.CoachingAuth = CoachingAuth;
window.SessionManager = SessionManager;
window.MessageManager = MessageManager;
window.supabaseClient = supabaseClient;
