        // Echter Supabase Login
        try {
            const { data, error } = await CoachingAuth.signIn(email, password);
            
            if (error) {
                // Fallback zu Demo-Accounts
                const demoAccounts = {
                    'coach@demo.de': { password: 'demo123', role: 'coach' },
                    'klient@demo.de': { password: 'demo123', role: 'client' }
                };
                
                if (demoAccounts[email] && demoAccounts[email].password === password) {
                    sessionStorage.setItem('userRole', demoAccounts[email].role);
                    sessionStorage.setItem('userEmail', email);
                    sessionStorage.setItem('isLoggedIn', 'true');
                    
                    if (demoAccounts[email].role === 'coach') {
                        window.location.href = 'dashboard.html';
                    } else {
                        window.location.href = 'chat.html';
                    }
                } else {
                    alert('Login fehlgeschlagen: ' + error.message);
                }
            } else {
                // Erfolgreicher Supabase Login
                const userRole = data.user.user_metadata?.role || 'client';
                sessionStorage.setItem('userRole', userRole);
                sessionStorage.setItem('userEmail', email);
                sessionStorage.setItem('isLoggedIn', 'true');
                sessionStorage.setItem('userId', data.user.id);
                
                if (userRole === 'coach') {
                    window.location.href = 'dashboard.html';
                } else {
                    window.location.href = 'chat.html';
                }
            }
        } catch (err) {
            alert('Login-Fehler: ' + err.message);
        }
