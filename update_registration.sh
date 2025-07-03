#!/bin/bash

echo "🚀 Updating Coaching Cockpit with Registration Feature..."

# 1. Backup current index.html
cp index.html index.html.pre-registration

# 2. Create registration modal HTML
cat > registration_modal.html << 'EOF'
    <!-- Registration Modal -->
    <div id="registrationModal" class="modal hidden">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Account erstellen</h3>
                <button class="modal-close" onclick="closeRegistration()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="registrationForm">
                    <div class="input-group">
                        <label for="regFullName">Vollständiger Name</label>
                        <input type="text" id="regFullName" required placeholder="Max Mustermann">
                    </div>
                    
                    <div class="input-group">
                        <label for="regEmail">E-Mail</label>
                        <input type="email" id="regEmail" required placeholder="max@example.com">
                    </div>
                    
                    <div class="input-group">
                        <label for="regPassword">Passwort</label>
                        <input type="password" id="regPassword" required placeholder="Mindestens 6 Zeichen">
                    </div>
                    
                    <div class="input-group">
                        <label for="regRole">Ich bin...</label>
                        <select id="regRole" required>
                            <option value="client">Klient/Coachee</option>
                            <option value="coach">Coach</option>
                        </select>
                    </div>
                    
                    <button type="submit" class="login-btn">
                        <span>Account erstellen</span>
                        <i class="fas fa-user-plus"></i>
                    </button>
                </form>
                
                <div class="signup-link" style="margin-top: 20px;">
                    Bereits registriert? <a href="#" onclick="closeRegistration()">Jetzt anmelden</a>
                </div>
            </div>
        </div>
    </div>
EOF

# 3. Create registration JavaScript
cat > registration_js.html << 'EOF'
        // Registration Functions
        function showRegistration() {
            document.getElementById('registrationModal').classList.remove('hidden');
        }
        
        function closeRegistration() {
            document.getElementById('registrationModal').classList.add('hidden');
        }
        
        // Registration Form Handler
        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('registrationForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const fullName = document.getElementById('regFullName').value;
                const email = document.getElementById('regEmail').value;
                const password = document.getElementById('regPassword').value;
                const role = document.getElementById('regRole').value;
                
                if (password.length < 6) {
                    alert('Passwort muss mindestens 6 Zeichen lang sein!');
                    return;
                }
                
                try {
                    const { data, error } = await CoachingAuth.signUp(email, password, fullName, role);
                    
                    if (error) {
                        alert('Registrierung fehlgeschlagen: ' + error.message);
                    } else {
                        alert('Account erfolgreich erstellt! Bitte bestätige deine E-Mail-Adresse.');
                        closeRegistration();
                        
                        // Auto-Login nach Registrierung
                        setTimeout(async () => {
                            const loginResult = await CoachingAuth.signIn(email, password);
                            if (loginResult.data) {
                                sessionStorage.setItem('userRole', role);
                                sessionStorage.setItem('userEmail', email);
                                sessionStorage.setItem('isLoggedIn', 'true');
                                sessionStorage.setItem('userId', loginResult.data.user.id);
                                
                                if (role === 'coach') {
                                    window.location.href = 'dashboard.html';
                                } else {
                                    window.location.href = 'chat.html';
                                }
                            }
                        }, 1000);
                    }
                } catch (err) {
                    alert('Registrierungs-Fehler: ' + err.message);
                }
            });
        });
EOF

# 4. Update signup link in index.html
sed -i.bak 's|<a href="#">Jetzt registrieren</a>|<a href="#" onclick="showRegistration()">Jetzt registrieren</a>|g' index.html

# 5. Insert registration modal before </body>
sed -i.bak2 '/<\/body>/i\
' index.html

# Add registration modal
sed -i.bak3 '/<\/body>/{
r registration_modal.html
}' index.html

# 6. Insert registration JavaScript before the closing script tag
sed -i.bak4 '/<\/script>/{
i\
        
r registration_js.html
}' index.html

# 7. Add modal CSS if not already present
if ! grep -q "\.modal {" css/styles.css; then
cat >> css/styles.css << 'EOF'

/* ===== MODAL ENHANCEMENTS ===== */
.modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.3s ease;
}

.modal.hidden {
    display: none;
}

.modal-content {
    background: white;
    border-radius: 16px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
}

.modal-header {
    padding: 24px 24px 16px;
    border-bottom: 1px solid #F3F4F6;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-header h3 {
    margin: 0;
    color: #1F2937;
}

.modal-close {
    background: none;
    border: none;
    color: #6B7280;
    font-size: 18px;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
}

.modal-close:hover {
    background: #F3F4F6;
}

.modal-body {
    padding: 16px 24px 24px;
}

@keyframes fadeIn {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
}
EOF
fi

# 8. Clean up temporary files
rm -f registration_modal.html registration_js.html

# 9. Add and commit changes
git add .
git commit -m "Add user registration with Supabase integration"

echo "✅ Registration feature added successfully!"
echo ""
echo "🚀 Ready to deploy:"
echo "vercel --prod"
echo ""
echo "📋 Features added:"
echo "- Registration modal with name, email, password, role"
echo "- Supabase user creation"
echo "- Auto-login after registration"
echo "- Email confirmation flow"
echo "- Modal styling and animations"
