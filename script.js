
        const API_URL = 'https://script.google.com/macros/s/AKfycbyXT_1POiww_YivDrpHX6oH4-CAKjwrsyMxdoY_CbzVBUozcwVdUY8hL9x9hJSC90xKmw/exec';
        
        let currentUser = null;
        let currentRole = null;
        let currentAdminUsers = [];
        let currentData = [];
        let selectedNDForTransfer = null;
        let isSearchMode = false;
        let currentSearchTerm = '';
        let statsCollapsed = true;

        // Connexion
        async function login() {
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();
            const errorMsg = document.getElementById('errorMessage');
            
            if (!username || !password) {
                showError('Veuillez saisir le nom d\'utilisateur et le mot de passe');
                return;
            }
            
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain;charset=utf-8'
                    },
                    body: JSON.stringify({
                        action: 'login',
                        username: username,
                        password: password
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    currentUser = result.data.username;
                    currentRole = result.data.role;
                    
                    document.getElementById('loginPage').style.display = 'none';
                    document.getElementById('mainPage').style.display = 'block';
                    
                    // Mettre à jour le badge de rôle
                    const roleBadge = document.getElementById('userRoleBadge');
                    roleBadge.textContent = currentRole === 'admin' ? 'Administrateur' : 'Utilisateur';
                    
                    // Afficher/masquer la barre de recherche
                    if (currentRole === 'admin') {
                        document.getElementById('adminSearchBox').style.display = 'flex';
                        document.getElementById('pageTitle').textContent = `Administrateur - ` + currentUser;
                        await loadAdminUsers();
                    } else {
                        document.getElementById('adminSearchBox').style.display = 'none';
                        document.getElementById('pageTitle').textContent = `Utilisateur - ${currentUser}`;
                    }
                    
                    refreshData();
                } else {
                    showError(result.message);
                }
            } catch (error) {
                showError('Erreur de connexion au serveur: ' + error.message);
                console.error('Login error:', error);
            }
        }

        // Charger les utilisateurs sous l'administrateur
        async function loadAdminUsers() {
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain;charset=utf-8'
                    },
                    body: JSON.stringify({
                        action: 'getUsersByAdmin',
                        adminUsername: currentUser
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    currentAdminUsers = result.data;
                    console.log('Utilisateurs sous administration:', currentAdminUsers);
                }
            } catch (error) {
                console.error('Error loading admin users:', error);
            }
        }

        // Actualiser les données
        async function refreshData() {
            isSearchMode = false;
            currentSearchTerm = '';
            document.getElementById('searchInput').value = '';
            statsCollapsed = true;
            
            const contentArea = document.getElementById('contentArea');
            contentArea.innerHTML = '<div class="loading">Chargement des données...</div>';
            
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain;charset=utf-8'
                    },
                    body: JSON.stringify({
                        action: 'getData',
                        username: currentUser,
                        role: currentRole
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    currentData = result.data;
                    displayData(result.data);
                } else {
                    contentArea.innerHTML = `
                        <div class="error-box">
                            <strong>Erreur de chargement des données:</strong><br>
                            ${result.message}
                        </div>
                    `;
                }
            } catch (error) {
                contentArea.innerHTML = `
                    <div class="error-box">
                        <strong>Erreur de connexion au serveur:</strong><br>
                        ${error.message}
                    </div>
                `;
                console.error('Refresh error:', error);
            }
        }

        // دالة البحث عن ND
        async function searchND() {
            const searchTerm = document.getElementById('searchInput').value.trim();
            
            if (!searchTerm) {
                alert('Veuillez entrer un numéro ND à rechercher');
                return;
            }
            
            isSearchMode = true;
            currentSearchTerm = searchTerm;
            statsCollapsed = true;
            
            const contentArea = document.getElementById('contentArea');
            contentArea.innerHTML = '<div class="loading">Recherche en cours...</div>';
            
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain;charset=utf-8'
                    },
                    body: JSON.stringify({
                        action: 'searchND',
                        searchTerm: searchTerm,
                        adminUsername: currentUser
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    if (result.data.length > 0) {
                        currentData = result.data;
                        displaySearchResults(result.data, searchTerm);
                    } else {
                        contentArea.innerHTML = `
                            <div class="no-data">
                                Aucun résultat trouvé pour "${searchTerm}"
                                <br><br>
                                <button class="btn-refresh" onclick="refreshData()" 
                                        style="margin-top: 10px;">
                                    Retour à la liste complète
                                </button>
                            </div>
                        `;
                    }
                } else {
                    contentArea.innerHTML = `
                        <div class="error-box">
                            <strong>Erreur de recherche:</strong><br>
                            ${result.message}
                        </div>
                    `;
                }
            } catch (error) {
                contentArea.innerHTML = `
                    <div class="error-box">
                        <strong>Erreur de connexion:</strong><br>
                        ${error.message}
                    </div>
                `;
                console.error('Search error:', error);
            }
        }

        // عرض نتائج البحث
        function displaySearchResults(results, searchTerm) {
            const contentArea = document.getElementById('contentArea');
            
            let html = `
                <div class="search-results-header">
                    <strong>Résultats de recherche pour: "${searchTerm}"</strong>
                    <span style="float: right;">
                        <button class="btn-refresh" onclick="refreshData()">
                            Retour à la liste complète
                        </button>
                    </span>
                </div>
                
                <div style="margin-bottom: 15px; color: var(--gray); font-size: 14px;">
                    ${results.length} résultat(s) trouvé(s)
                </div>
            `;
            
            if (results.length === 0) {
                html += '<div class="no-data">Aucun résultat trouvé</div>';
            } else {
                results.forEach((nd, index) => {
                    const isInProgress = nd.inProgress ? 'in-progress' : '';
                    const isReturned = nd.returned ? 'returned' : '';
                    const ndTitle = nd.ND ? `ND: ${nd.ND}` : 'ND sans numéro';
                    
                    html += `
                        <div class="nd-item ${isInProgress} ${isReturned}">
                            <div class="nd-header" onclick="toggleSearchND(${index})">
                                <div>
                                    <div class="nd-title">${ndTitle}</div>
                                    <div class="nd-secteur">${nd.Secteur || 'Non spécifié'}</div>
                                    <div style="font-size: 12px; color: var(--gray); margin-top: 3px;">
                                        Statut: ${nd.Admin_OK === 'OK' ? 'Confirmé' : 'En attente'}
                                    </div>
                                </div>
                                <div>▼</div>
                            </div>
                            <div class="nd-details" id="search-nd-${index}">
                                ${renderSearchNDDetails(nd, index)}
                            </div>
                        </div>
                    `;
                });
            }
    
            contentArea.innerHTML = html;
        }

        // عرض تفاصيل ND في نتائج البحث
        function renderSearchNDDetails(nd, index) {
            let html = `
                <div class="section-title">Informations Complètes du Dossier</div>
                <div class="info-grid">
                    <div class="info-card">
                        <div class="info-title">ND</div>
                        <div class="info-value">${nd.ND || 'Non spécifié'}</div>
                    </div>
                    <div class="info-card">
                        <div class="info-title">Statut Admin</div>
                        <div class="info-value" style="color: ${nd.Admin_OK === 'OK' ? '#2e7d32' : '#c62828'}; 
                                               font-weight: bold;">
                            ${nd.Admin_OK === 'OK' ? '✓ Confirmé' : '⏳ En attente'}
                        </div>
                    </div>
                    <div class="info-card">
                        <div class="info-title">Secteur</div>
                        <div class="info-value">${nd.Secteur || 'Non spécifié'}</div>
                    </div>
                    <div class="info-card">
                        <div class="info-title">Constitution</div>
                        <div class="info-value">${nd.Constitution || 'Non spécifié'}</div>
                    </div>
                    <div class="info-card">
                        <div class="info-title">Client</div>
                        <div class="info-value">${nd.Client || 'Non spécifié'}</div>
                    </div>
                    <div class="info-card">
                        <div class="info-title">Contact Client</div>
                        <div class="info-value">${nd['Contact client'] || 'Non spécifié'}</div>
                    </div>
                    <div class="info-card">
                        <div class="info-title">IVR</div>
                        <div class="info-value">${nd.IVR || 'Non spécifié'}</div>
                    </div>
                    <div class="info-card">
                        <div class="info-title">Motif</div>
                        <div class="info-value">${nd.Motif || 'Non spécifié'}</div>
                    </div>
                    <div class="info-card">
                        <div class="info-title">Commentaire</div>
                        <div class="info-value">${nd.Commentaire || 'Aucun'}</div>
                    </div>
                    <div class="info-card">
                        <div class="info-title">Date RDV</div>
                        <div class="info-value">${nd.DateTimeRDV || 'Non spécifié'}</div>
                    </div>
                    <div class="info-card">
                        <div class="info-title">Clôturé par</div>
                        <div class="info-value">${nd.ClosedBy || 'Non spécifié'}</div>
                    </div>
                    <div class="info-card">
                        <div class="info-title">Date Clôture</div>
                        <div class="info-value">${nd.ClosedAt || 'Non spécifié'}</div>
                    </div>
                    <div class="info-card">
                        <div class="info-title">Date Confirmation</div>
                        <div class="info-value">${nd.Admin_ConfirmDate || 'Non confirmé'}</div>
                    </div>
                </div>
            `;
            
            // إذا كان ND معاد
            if (nd.returned) {
                html += `
                    <div class="info-card" style="background: #fff3e0; border-color: #ff9800;">
                        <div class="info-title">Raison du retour</div>
                        <div class="info-value">${nd.returnReason || 'Non spécifié'}</div>
                    </div>
                `;
            }
            
            // إذا كان ND في انتظار التأكيد
            if (nd.Admin_OK !== 'OK') {
                html += `
                    <div style="margin-top: 20px; text-align: center;">
                        <button class="btn-confirm" onclick="confirmSearchND('${nd.ND}')">
                            Confirmer ce Dossier
                        </button>
                        ${!nd.returned ? `
                        <button class="btn-return" onclick="returnSearchND('${nd.ND}')">
                            Renvoyer pour Correction
                        </button>
                        ` : ''}
                    </div>
                `;
            }
    
            return html;
        }

        // إعادة ND من نتائج البحث
        async function returnSearchND(ndNumber) {
            const reason = prompt("Veuillez entrer la raison du retour (optionnel):");
            if (reason === null) return;
            
            if (!confirm(`Êtes-vous sûr de vouloir renvoyer le dossier ${ndNumber} pour correction?`)) {
                return;
            }
            
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain;charset=utf-8'
                    },
                    body: JSON.stringify({
                        action: 'returnND',
                        nd: ndNumber,
                        returnReason: reason || '',
                        admin: currentUser
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('Dossier renvoyé pour correction avec succès');
                    searchND();
                } else {
                    alert('Erreur: ' + result.message);
                }
            } catch (error) {
                alert('Erreur de connexion: ' + error.message);
                console.error('Return search ND error:', error);
            }
        }

        // Afficher les données
        function displayData(data) {
            const contentArea = document.getElementById('contentArea');
            
            if (data.length === 0) {
                contentArea.innerHTML = '<div class="no-data">Aucune donnée disponible pour le moment</div>';
                return;
            }
            
            let html = '';
            
            // Pour les administrateurs: afficher الإحصائيات القابلة للطي
            if (currentRole === 'admin' && currentAdminUsers.length > 0 && !isSearchMode) {
                html += renderCollapsibleStatistics();
            }
            
            // Afficher les ND
            data.forEach((nd, index) => {
                const isInProgress = nd.inProgress ? 'in-progress' : '';
                const isReturned = nd.returned ? 'returned' : '';
                const ndTitle = nd.ND ? `ND: ${nd.ND}` : 'ND sans numéro';
                const statusBadge = nd.returned ? '<span style="color: #f44336; font-size: 12px; margin-left: 10px;">(Retourné pour correction)</span>' : '';
                
                html += `
                    <div class="nd-item ${isInProgress} ${isReturned}">
                        <div class="nd-header" onclick="toggleND(${index})">
                            <div>
                                <div class="nd-title">${ndTitle} ${statusBadge}</div>
                                <div class="nd-secteur">${nd.Secteur || 'Non spécifié'}</div>
                            </div>
                            <div>▼</div>
                        </div>
                        <div class="nd-details" id="nd-${index}">
                            ${renderNDDetails(nd, index)}
                        </div>
                    </div>
                `;
            });
            
            contentArea.innerHTML = html;
        }

        // Afficher les statistiques des utilisateurs (pour admin) بشكل قابل للطي
        function renderCollapsibleStatistics() {
            const isOpen = !statsCollapsed;
            const iconClass = isOpen ? 'stats-collapsible-icon open' : 'stats-collapsible-icon';
            
            let html = `
                <div class="stats-collapsible">
                    <div class="stats-collapsible-header" onclick="toggleStats()">
                        <h3>Statistiques des Utilisateurs</h3>
                        <div class="${iconClass}">▼</div>
                    </div>
                    <div class="stats-collapsible-content ${isOpen ? 'open' : ''}" id="statsContent">
                        <div class="stats-grid">
                            <div class="stat-card">
                                <div class="stat-value">${currentAdminUsers.length}</div>
                                <div class="stat-label">Utilisateurs Actifs</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${currentData.length}</div>
                                <div class="stat-label">Dossiers Totaux</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${currentData.filter(nd => nd.inProgress).length}</div>
                                <div class="stat-label">En Attente</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${currentData.filter(nd => nd.returned).length}</div>
                                <div class="stat-label">Retournés</div>
                            </div>
                        </div>
                        
                        <div class="section-title" style="margin-top: 20px;">Utilisateurs du Secteur</div>
                        <div class="users-list">
            `;
            
            currentAdminUsers.forEach(user => {
                html += `
                    <div class="user-card">
                        <div class="user-name">${user.username}</div>
                        <div class="user-secteur">${user.secteur}</div>
                        <span class="user-status">Actif</span>
                    </div>
                `;
            });
            
            html += `
                        </div>
                    </div>
                </div>
            `;
            
            return html;
        }

        // دالة لفتح/غلق الإحصائيات
        function toggleStats() {
            statsCollapsed = !statsCollapsed;
            const statsContent = document.getElementById('statsContent');
            const statsIcon = document.querySelector('.stats-collapsible-icon');
            
            if (statsContent) {
                if (statsCollapsed) {
                    statsContent.classList.remove('open');
                    statsIcon.classList.remove('open');
                } else {
                    statsContent.classList.add('open');
                    statsIcon.classList.add('open');
                }
            } else {
                displayData(currentData);
            }
        }

        // Afficher les détails ND
        function renderNDDetails(nd, index) {
            let html = '';
            
            if (currentRole === 'user') {
                // حالة ND المعاد
                if (nd.returned) {
                    html += `
                        <div class="section-title" style="color: #f44336;">
                            ⚠️ Dossier Retourné pour Correction
                        </div>
                        ${nd.returnReason ? `
                        <div class="info-card" style="background: #fff3e0; border-color: #ff9800;">
                            <div class="info-title">Raison du retour</div>
                            <div class="info-value">${nd.returnReason}</div>
                        </div>
                        ` : ''}
                        
                        <div class="section-title">Informations du Dossier (à corriger)</div>
                        <div class="info-grid">
                            <div class="info-card">
                                <div class="info-title">ND</div>
                                <div class="info-value">${nd.ND || 'Non spécifié'}</div>
                            </div>
                            <div class="info-card">
                                <div class="info-title">IVR (ancien)</div>
                                <div class="info-value">${nd.IVR || 'Non spécifié'}</div>
                            </div>
                            <div class="info-card">
                                <div class="info-title">Motif (ancien)</div>
                                <div class="info-value">${nd.Motif || 'Non spécifié'}</div>
                            </div>
                            <div class="info-card">
                                <div class="info-title">Commentaire (ancien)</div>
                                <div class="info-value">${nd.Commentaire || 'Aucun'}</div>
                            </div>
                        </div>
                    `;
                }
                
                html += `
                    <div class="section-title">${nd.returned ? 'Correction des Informations' : 'Informations du Dossier'}</div>
                    <div class="info-grid">
                        <div class="info-card">
                            <div class="info-title">ND</div>
                            <div class="info-value">${nd.ND || 'Non spécifié'}</div>
                        </div>
                        <div class="info-card">
                            <div class="info-title">Constitution</div>
                            <div class="info-value">${nd.Constitution || 'Non spécifié'}</div>
                        </div>
                        <div class="info-card">
                            <div class="info-title">S. Produit</div>
                            <div class="info-value">${nd['S. Produit'] || 'Non spécifié'}</div>
                        </div>
                        <div class="info-card">
                            <div class="info-title">Client</div>
                            <div class="info-value">${nd.Client || 'Non spécifié'}</div>
                        </div>
                        <div class="info-card">
                            <div class="info-title">Secteur</div>
                            <div class="info-value">${nd.Secteur || 'Non spécifié'}</div>
                        </div>
                        <div class="info-card">
                            <div class="info-title">Contact client</div>
                            <div class="info-value">${nd['Contact client'] || 'Non spécifié'}</div>
                        </div>
                        <div class="info-card">
                            <div class="info-title">Adresse</div>
                            <div class="info-value">${nd.ADRESSE || 'Non spécifié'}</div>
                        </div>
                    </div>
                    
                    <div class="section-title">Saisie des Informations de Clôture</div>
                    
                    <div class="detail-row">
                        <label class="detail-label">IVR:</label>
                        <select id="ivr-${index}" onchange="handleIVRChange(${index})">
                            <option value="NON" ${nd.IVR === 'NON' ? 'selected' : ''}>NON</option>
                            <option value="OK" ${nd.IVR === 'OK' ? 'selected' : ''}>OK</option>
                            <option value="INJ" ${nd.IVR === 'INJ' ? 'selected' : ''}>INJ</option>
                            <option value="RDV" ${nd.IVR === 'RDV' ? 'selected' : ''}>RDV</option>
                        </select>
                    </div>
                    
                    <div id="datetime-container-${index}" style="display: none;" class="detail-row">
                        <label class="detail-label">Date et Heure:</label>
                        <input type="datetime-local" id="datetime-${index}" class="datetime-input"
                               value="${nd.DateTimeRDV || ''}">
                    </div>
                    
                    <div class="detail-row">
                        <label class="detail-label">Motif:</label>
                        <select id="motif-${index}">
                            <option value="NON" ${nd.Motif === 'NON' ? 'selected' : ''}>NON</option>
                            <option value="@rouge" ${nd.Motif === '@rouge' ? 'selected' : ''}>@rouge</option>
                            <option value="Microcoupure" ${nd.Motif === 'Microcoupure' ? 'selected' : ''}>Microcoupure</option>
                            <option value="Borne oxydée" ${nd.Motif === 'Borne oxydée' ? 'selected' : ''}>Borne oxydée</option>
                            <option value="Port isolé" ${nd.Motif === 'Port isolé' ? 'selected' : ''}>Port isolé</option>
                        </select>
                    </div>
                    
                    <div class="detail-row">
                        <label class="detail-label">Commentaire (optionnel):</label>
                        <textarea id="comment-${index}" rows="3" placeholder="Entrez un commentaire...">${nd.Commentaire || ''}</textarea>
                    </div>
                    
                    <button class="btn-close" onclick="closeND(${index})">
                        ${nd.returned ? 'Envoyer les Corrections' : 'Clôturer ND et Envoyer pour Confirmation'}
                    </button>
                `;
                
                // إذا كان ND معاد، فعرض التاريخ السابق
                if (nd.returned && nd.IVR && (nd.IVR === 'INJ' || nd.IVR === 'RDV')) {
                    setTimeout(() => {
                        const select = document.getElementById(`ivr-${index}`);
                        const datetimeContainer = document.getElementById(`datetime-container-${index}`);
                        if (select && datetimeContainer) {
                            select.dispatchEvent(new Event('change'));
                        }
                    }, 100);
                }
            } 
            else if (currentRole === 'admin') {
                // Pour l'administrateur
                if (nd.inProgress) {
                    html += `
                        <div class="section-title">Informations de Clôture (En Attente de Confirmation)</div>
                        <div class="info-grid">
                            <div class="info-card">
                                <div class="info-title">IVR</div>
                                <div class="info-value">${nd.IVR || nd.Client || 'Non spécifié'}</div>
                            </div>
                            <div class="info-card">
                                <div class="info-title">Motif</div>
                                <div class="info-value">${nd.Motif || 'Non spécifié'}</div>
                            </div>
                            <div class="info-card">
                                <div class="info-title">Commentaire</div>
                                <div class="info-value">${nd.Commentaire || 'Aucun'}</div>
                            </div>
                            <div class="info-card">
                                <div class="info-title">Clôturé par</div>
                                <div class="info-value">${nd.ClosedBy || 'Non spécifié'}</div>
                            </div>
                            ${nd.returned ? `
                            <div class="info-card" style="background: #fff3e0; border-color: #ff9800;">
                                <div class="info-title">Raison du retour précédent</div>
                                <div class="info-value">${nd.returnReason || 'Non spécifié'}</div>
                            </div>
                            ` : ''}
                        </div>
                        
                        <div style="margin-top: 20px; text-align: center;">
                            <button class="btn-confirm" onclick="confirmND(${index})">
                                Confirmer Définitivement
                            </button>
                            <button class="btn-return" onclick="returnND(${index})">
                                Renvoyer pour Correction
                            </button>
                        </div>
                    `;
                } else {
                    html += `
                        <div class="section-title">Informations du Dossier</div>
                        <div class="info-grid">
                            <div class="info-card">
                                <div class="info-title">ND</div>
                                <div class="info-value">${nd.ND || 'Non spécifié'}</div>
                            </div>
                            <div class="info-card">
                                <div class="info-title">Nom Client</div>
                                <div class="info-value">${nd['Client'] || 'Non spécifié'}</div>
                            </div>
                            <div class="info-card">
                                <div class="info-title">Secteur</div>
                                <div class="info-value">${nd.Secteur || 'Non spécifié'}</div>
                            </div>
                            <div class="info-card">
                                <div class="info-title">Type</div>
                                <div class="info-value">${nd['S. Produit'] || 'Non spécifié'}</div>
                            </div>
                        </div>
                        
                        <div style="margin-top: 20px; text-align: center;">
                            <button class="btn-transfer" onclick="openTransferModal(${index})">Transférer à un Utilisateur</button>
                        </div>
                    `;
                }
            }
            
            return html;
        }

        // Ouvrir/fermer ND
        function toggleND(index) {
            const details = document.getElementById(`nd-${index}`);
            details.classList.toggle('open');
        }

        // Ouvrir/fermer les détails dans les résultats de recherche
        function toggleSearchND(index) {
            const details = document.getElementById(`search-nd-${index}`);
            details.classList.toggle('open');
        }

        // Gérer le changement IVR
        function handleIVRChange(index) {
            const select = document.getElementById(`ivr-${index}`);
            const datetimeContainer = document.getElementById(`datetime-container-${index}`);
            const datetimeInput = document.getElementById(`datetime-${index}`);
            
            if (select.value === 'INJ' || select.value === 'RDV') {
                datetimeContainer.style.display = 'block';
                
                if (select.value === 'INJ') {
                    const now = new Date();
                    now.setHours(now.getHours() + 1);
                    datetimeInput.value = now.toISOString().slice(0, 16);
                } else if (select.value === 'RDV') {
                    datetimeInput.value = '';
                }
            } else {
                datetimeContainer.style.display = 'none';
            }
        }

        // Clôturer ND (par l'utilisateur)
        async function closeND(index) {
            const nd = currentData[index];
            const ivr = document.getElementById(`ivr-${index}`).value;
            const motif = document.getElementById(`motif-${index}`).value;
            const comment = document.getElementById(`comment-${index}`).value;
            
            let datetime = null;
            if (ivr === 'INJ' || ivr === 'RDV') {
                datetime = document.getElementById(`datetime-${index}`).value;
                if (!datetime) {
                    alert('Veuillez spécifier la date et l\'heure');
                    return;
                }
            }
            
            if (ivr === 'NON' || motif === 'NON') {
                alert('Veuillez remplir tous les champs obligatoires');
                return;
            }
            
            if (!confirm('Êtes-vous sûr de vouloir clôturer ce dossier et l\'envoyer pour confirmation?')) {
                return;
            }
            
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain;charset=utf-8'
                    },
                    body: JSON.stringify({
                        action: 'closeND',
                        nd: nd,
                        client: ivr,
                        motif: motif,
                        commentaire: comment,
                        datetime: datetime,
                        username: currentUser,
                        userRole: currentRole
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('Dossier clôturé avec succès et envoyé pour confirmation de l\'administrateur');
                    refreshData();
                } else {
                    alert('Erreur: ' + result.message);
                }
            } catch (error) {
                alert('Erreur de connexion: ' + error.message);
                console.error('Close ND error:', error);
            }
        }

        // Confirmer ND (par l'administrateur)
        async function confirmND(index) {
            const nd = currentData[index];
            
            if (!confirm(`Êtes-vous sûr de vouloir confirmer définitivement le dossier ${nd.ND}?`)) {
                return;
            }
            
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain;charset=utf-8'
                    },
                    body: JSON.stringify({
                        action: 'confirmND',
                        nd: nd.ND
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('Dossier confirmé avec succès');
                    refreshData();
                } else {
                    alert('Erreur: ' + result.message);
                }
            } catch (error) {
                alert('Erreur de connexion: ' + error.message);
                console.error('Confirm ND error:', error);
            }
        }

        // Confirmer ND depuis les résultats de recherche
        async function confirmSearchND(ndNumber) {
            if (!confirm(`Êtes-vous sûr de vouloir confirmer définitivement le dossier ${ndNumber}?`)) {
                return;
            }
            
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain;charset=utf-8'
                    },
                    body: JSON.stringify({
                        action: 'confirmND',
                        nd: ndNumber
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('Dossier confirmé avec succès');
                    searchND();
                } else {
                    alert('Erreur: ' + result.message);
                }
            } catch (error) {
                alert('Erreur de connexion: ' + error.message);
                console.error('Confirm search ND error:', error);
            }
        }

        // إعادة ND للمستخدم للتصحيح
        async function returnND(index) {
            const nd = currentData[index];
            
            const reason = prompt("Veuillez entrer la raison du retour (optionnel):");
            if (reason === null) return;
            
            if (!confirm(`Êtes-vous sûr de vouloir renvoyer le dossier ${nd.ND} pour correction?`)) {
                return;
            }
            
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain;charset=utf-8'
                    },
                    body: JSON.stringify({
                        action: 'returnND',
                        nd: nd.ND,
                        returnReason: reason || '',
                        admin: currentUser
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('Dossier renvoyé pour correction avec succès');
                    refreshData();
                } else {
                    alert('Erreur: ' + result.message);
                }
            } catch (error) {
                alert('Erreur de connexion: ' + error.message);
                console.error('Return ND error:', error);
            }
        }

        // Ouvrir la modal de transfert
        function openTransferModal(index) {
            selectedNDForTransfer = currentData[index];
            
            const transferUserSelect = document.getElementById('transferUser');
            transferUserSelect.innerHTML = '<option value="">-- Sélectionner un utilisateur --</option>';
            
            currentAdminUsers.forEach(user => {
                const option = document.createElement('option');
                option.value = user.username;
                option.textContent = `${user.username} (${user.secteur})`;
                option.setAttribute('data-secteur', user.secteur);
                transferUserSelect.appendChild(option);
            });
            
            transferUserSelect.onchange = function() {
                const selectedOption = this.options[this.selectedIndex];
                const secteur = selectedOption.getAttribute('data-secteur') || '';
                document.getElementById('targetSecteur').value = secteur;
            };
            
            document.getElementById('transferModal').style.display = 'block';
        }

        // Fermer la modal de transfert
        function closeTransferModal() {
            document.getElementById('transferModal').style.display = 'none';
            document.getElementById('transferUser').value = '';
            document.getElementById('targetSecteur').value = '';
            document.getElementById('transferReason').value = '';
            selectedNDForTransfer = null;
        }

        // Exécuter le transfert
        async function executeTransfer() {
            const targetUser = document.getElementById('transferUser').value;
            const targetSecteur = document.getElementById('targetSecteur').value;
            const reason = document.getElementById('transferReason').value.trim();
            
            if (!targetUser) {
                alert('Veuillez sélectionner un utilisateur');
                return;
            }
            
            if (!selectedNDForTransfer) {
                alert('Aucun dossier ND sélectionné pour le transfert');
                return;
            }
            
            if (!confirm(`Êtes-vous sûr de vouloir transférer le dossier ${selectedNDForTransfer.ND} à ${targetUser}?`)) {
                return;
            }
            
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain;charset=utf-8'
                    },
                    body: JSON.stringify({
                        action: 'transferND',
                        nd: selectedNDForTransfer.ND,
                        targetUser: targetUser,
                        transferReason: reason,
                        admin: currentUser
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert(`Dossier transféré avec succès à ${targetUser}`);
                    closeTransferModal();
                    refreshData();
                } else {
                    alert('Erreur: ' + result.message);
                }
            } catch (error) {
                alert('Erreur de connexion: ' + error.message);
                console.error('Transfer error:', error);
            }
        }

        // Afficher un message d'erreur
        function showError(message) {
            const errorMsg = document.getElementById('errorMessage');
            errorMsg.textContent = message;
            errorMsg.style.display = 'block';
            setTimeout(() => {
                errorMsg.style.display = 'none';
            }, 3000);
        }

        // Déconnexion
        function logout() {
            if (confirm('Voulez-vous vraiment vous déconnecter?')) {
                currentUser = null;
                currentRole = null;
                currentAdminUsers = [];
                currentData = [];
                selectedNDForTransfer = null;
                isSearchMode = false;
                currentSearchTerm = '';
                statsCollapsed = true;
                
                document.getElementById('adminSearchBox').style.display = 'none';
                document.getElementById('mainPage').style.display = 'none';
                document.getElementById('loginPage').style.display = 'block';
                document.getElementById('username').value = '';
                document.getElementById('password').value = '';
                document.getElementById('userRoleBadge').textContent = '';
            }
        }

        // Permettre la connexion مع Enter
        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('password').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    login();
                }
            });
            
            // Permettre البحث مع Enter
            document.getElementById('searchInput')?.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    searchND();
                }
            });
            
            // Fermer la modal en cliquant à l'extérieur
            window.onclick = function(event) {
                const modal = document.getElementById('transferModal');
                if (event.target === modal) {
                    closeTransferModal();
                }
            }
        });
