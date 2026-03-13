/* ============================================
   MAXWELL CRM — CORE ENGINE
   ============================================ */

const CRM = {
    KEYS: {
        contacts: 'maxwell_crm_contacts',
        properties: 'maxwell_crm_properties',
        activities: 'maxwell_crm_activities'
    },
    sortField: 'updatedAt',
    sortDir: 'desc',

    /* ============ INIT ============ */
    init() {
        this.initSidebar();
        this.updateDashboard();
        this.renderContacts();
        this.setDate();

        // Check hash for direct navigation
        const hash = window.location.hash.replace('#', '');
        if (hash) this.switchView(hash);
    },

    setDate() {
        const el = document.getElementById('currentDate');
        if (el) el.textContent = new Date().toLocaleDateString('en-NZ', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    },

    /* ============ SIDEBAR ============ */
    initSidebar() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchView(item.dataset.view);
            });
        });

        const toggle = document.getElementById('sidebarToggle');
        if (toggle) {
            toggle.addEventListener('click', () => {
                document.getElementById('sidebar').classList.toggle('open');
            });
        }
    },

    switchView(view) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

        const viewEl = document.getElementById('view-' + view);
        const navEl = document.querySelector(`[data-view="${view}"]`);
        if (viewEl) viewEl.classList.add('active');
        if (navEl) navEl.classList.add('active');

        document.getElementById('sidebar').classList.remove('open');
        window.location.hash = view;

        // Refresh view data
        if (view === 'dashboard') this.updateDashboard();
        if (view === 'contacts') this.renderContacts();
        if (view === 'pipeline') this.renderPipeline();
        if (view === 'properties') this.renderProperties();
        if (view === 'activities') this.renderActivities();
        if (view === 'analytics') this.renderAnalytics();
    },

    /* ============ DATA HELPERS ============ */
    getContacts() {
        return JSON.parse(localStorage.getItem(this.KEYS.contacts) || '[]');
    },
    saveContacts(data) {
        localStorage.setItem(this.KEYS.contacts, JSON.stringify(data));
    },
    getProperties() {
        return JSON.parse(localStorage.getItem(this.KEYS.properties) || '[]');
    },
    saveProperties(data) {
        localStorage.setItem(this.KEYS.properties, JSON.stringify(data));
    },
    getActivities() {
        return JSON.parse(localStorage.getItem(this.KEYS.activities) || '[]');
    },
    saveActivities(data) {
        localStorage.setItem(this.KEYS.activities, JSON.stringify(data));
    },

    formatCurrency(n) {
        if (!n) return '$0';
        return '$' + Number(n).toLocaleString('en-NZ');
    },

    formatDate(d) {
        if (!d) return '';
        return new Date(d).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' });
    },

    timeAgo(d) {
        if (!d) return '';
        const diff = Date.now() - new Date(d).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return mins + 'm ago';
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return hrs + 'h ago';
        const days = Math.floor(hrs / 24);
        if (days < 30) return days + 'd ago';
        return this.formatDate(d);
    },

    toast(msg, type = 'success') {
        let t = document.querySelector('.toast');
        if (!t) {
            t = document.createElement('div');
            t.className = 'toast';
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.className = 'toast ' + type;
        requestAnimationFrame(() => t.classList.add('show'));
        setTimeout(() => t.classList.remove('show'), 3000);
    },

    /* ============ DASHBOARD ============ */
    updateDashboard() {
        const contacts = this.getContacts();
        const activities = this.getActivities();

        document.getElementById('statContacts').textContent = contacts.length;
        document.getElementById('statActive').textContent = contacts.filter(c => c.status === 'active' && c.stage !== 'closed_won' && c.stage !== 'closed_lost').length;
        document.getElementById('statWon').textContent = contacts.filter(c => c.stage === 'closed_won').length;

        const pipelineValue = contacts.filter(c => c.stage !== 'closed_lost').reduce((sum, c) => sum + (Number(c.dealValue) || 0), 0);
        document.getElementById('statValue').textContent = this.formatCurrency(pipelineValue);

        // Recent contacts
        const recentEl = document.getElementById('recentContacts');
        const recent = [...contacts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
        if (recent.length === 0) {
            recentEl.innerHTML = '<p class="empty-state">No contacts yet. Add your first or load demo data in Settings.</p>';
        } else {
            recentEl.innerHTML = recent.map(c => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f3f4f6;">
                    <div>
                        <strong style="font-size:14px;">${this.esc(c.firstName)} ${this.esc(c.lastName)}</strong>
                        <span style="font-size:12px;color:#9ca3af;margin-left:8px;">${this.esc(c.email || '')}</span>
                    </div>
                    <span class="stage-badge ${c.stage}">${this.stageName(c.stage)}</span>
                </div>
            `).join('');
        }

        // Pipeline overview
        const pipelineEl = document.getElementById('pipelineOverview');
        const stages = ['lead', 'contacted', 'viewing', 'negotiation', 'closed_won'];
        const stageCounts = stages.map(s => ({ stage: s, count: contacts.filter(c => c.stage === s).length }));
        if (contacts.length === 0) {
            pipelineEl.innerHTML = '<p class="empty-state">No pipeline data yet.</p>';
        } else {
            const maxCount = Math.max(...stageCounts.map(s => s.count), 1);
            pipelineEl.innerHTML = `<div class="bar-chart">${stageCounts.map(s => `
                <div class="bar-group">
                    <span class="bar-value">${s.count}</span>
                    <div class="bar" style="height:${Math.max((s.count / maxCount) * 100, 5)}%"></div>
                    <span class="bar-label">${this.stageName(s.stage)}</span>
                </div>
            `).join('')}</div>`;
        }

        // Recent activity
        const activityEl = document.getElementById('recentActivity');
        const allActs = this.getAllActivities().slice(0, 5);
        if (allActs.length === 0) {
            activityEl.innerHTML = '<p class="empty-state">No activities recorded yet.</p>';
        } else {
            activityEl.innerHTML = allActs.map(a => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f3f4f6;">
                    <div>
                        <span class="timeline-type">${this.esc(a.type)}</span>
                        <span style="font-size:13px;margin-left:8px;">${this.esc(a.description).substring(0, 60)}</span>
                    </div>
                    <span style="font-size:12px;color:#9ca3af;">${this.timeAgo(a.date)}</span>
                </div>
            `).join('');
        }
    },

    getAllActivities() {
        const standalone = this.getActivities();
        const contactActs = this.getContacts().flatMap(c =>
            (c.activities || []).map(a => ({ ...a, contactName: c.firstName + ' ' + c.lastName, contactId: c.id }))
        );
        return [...standalone, ...contactActs].sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    /* ============ CONTACTS ============ */
    renderContacts() {
        const contacts = this.getContacts();
        const search = (document.getElementById('contactSearch')?.value || '').toLowerCase();
        const stageF = document.getElementById('stageFilter')?.value || '';
        const statusF = document.getElementById('statusFilter')?.value || '';

        let filtered = contacts.filter(c => {
            const matchSearch = !search || `${c.firstName} ${c.lastName} ${c.email} ${c.phone}`.toLowerCase().includes(search);
            const matchStage = !stageF || c.stage === stageF;
            const matchStatus = !statusF || c.status === statusF;
            return matchSearch && matchStage && matchStatus;
        });

        // Sort
        filtered.sort((a, b) => {
            let va, vb;
            if (this.sortField === 'name') {
                va = (a.firstName + ' ' + a.lastName).toLowerCase();
                vb = (b.firstName + ' ' + b.lastName).toLowerCase();
            } else {
                va = (a[this.sortField] || '').toString().toLowerCase();
                vb = (b[this.sortField] || '').toString().toLowerCase();
            }
            if (va < vb) return this.sortDir === 'asc' ? -1 : 1;
            if (va > vb) return this.sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        const tbody = document.getElementById('contactsBody');
        const empty = document.getElementById('contactsEmpty');

        if (filtered.length === 0) {
            tbody.innerHTML = '';
            empty.style.display = 'block';
        } else {
            empty.style.display = 'none';
            tbody.innerHTML = filtered.map(c => `
                <tr>
                    <td><strong>${this.esc(c.firstName)} ${this.esc(c.lastName)}</strong></td>
                    <td>${this.esc(c.email || '—')}</td>
                    <td>${this.esc(c.phone || '—')}</td>
                    <td><span class="stage-badge ${c.stage}">${this.stageName(c.stage)}</span></td>
                    <td>${this.esc(c.source || '—')}</td>
                    <td>${this.timeAgo(c.updatedAt)}</td>
                    <td>
                        <div class="action-btns">
                            <button class="btn btn-sm btn-secondary" onclick="CRM.editContact('${c.id}')">Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="CRM.deleteContact('${c.id}')">Del</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
    },

    filterContacts() { this.renderContacts(); },

    sortContacts(field) {
        if (this.sortField === field) {
            this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDir = 'asc';
        }
        this.renderContacts();
    },

    openContactModal(id) {
        document.getElementById('contactModalTitle').textContent = id ? 'Edit Contact' : 'Add Contact';
        document.getElementById('contactModalForm').reset();
        document.getElementById('contactId').value = '';

        if (id) {
            const c = this.getContacts().find(x => x.id === id);
            if (c) {
                document.getElementById('contactId').value = c.id;
                document.getElementById('cmFirstName').value = c.firstName || '';
                document.getElementById('cmLastName').value = c.lastName || '';
                document.getElementById('cmEmail').value = c.email || '';
                document.getElementById('cmPhone').value = c.phone || '';
                document.getElementById('cmStage').value = c.stage || 'lead';
                document.getElementById('cmSource').value = c.source || 'website';
                document.getElementById('cmDealValue').value = c.dealValue || '';
                document.getElementById('cmNotes').value = c.notes || '';
            }
        }

        this.openModal('contactModal');
    },

    editContact(id) { this.openContactModal(id); },

    saveContact(e) {
        e.preventDefault();
        const contacts = this.getContacts();
        const id = document.getElementById('contactId').value;
        const data = {
            firstName: document.getElementById('cmFirstName').value.trim(),
            lastName: document.getElementById('cmLastName').value.trim(),
            email: document.getElementById('cmEmail').value.trim(),
            phone: document.getElementById('cmPhone').value.trim(),
            stage: document.getElementById('cmStage').value,
            source: document.getElementById('cmSource').value,
            dealValue: document.getElementById('cmDealValue').value,
            notes: document.getElementById('cmNotes').value.trim(),
            status: 'active',
            updatedAt: new Date().toISOString()
        };

        if (id) {
            const idx = contacts.findIndex(c => c.id === id);
            if (idx !== -1) {
                contacts[idx] = { ...contacts[idx], ...data };
            }
        } else {
            data.id = Date.now().toString();
            data.createdAt = new Date().toISOString();
            data.activities = [];
            contacts.push(data);
        }

        this.saveContacts(contacts);
        this.closeModal();
        this.renderContacts();
        this.updateDashboard();
        this.toast(id ? 'Contact updated' : 'Contact added');
    },

    deleteContact(id) {
        if (!confirm('Delete this contact?')) return;
        const contacts = this.getContacts().filter(c => c.id !== id);
        this.saveContacts(contacts);
        this.renderContacts();
        this.updateDashboard();
        this.toast('Contact deleted');
    },

    /* ============ PIPELINE ============ */
    renderPipeline() {
        const contacts = this.getContacts();
        const stages = [
            { key: 'lead', label: 'Lead' },
            { key: 'contacted', label: 'Contacted' },
            { key: 'viewing', label: 'Viewing' },
            { key: 'negotiation', label: 'Negotiation' },
            { key: 'closed_won', label: 'Closed Won' }
        ];

        const totalValue = contacts.filter(c => c.stage !== 'closed_lost').reduce((s, c) => s + (Number(c.dealValue) || 0), 0);
        document.getElementById('pipelineTotal').textContent = this.formatCurrency(totalValue) + ' total value';

        const board = document.getElementById('pipelineBoard');
        board.innerHTML = stages.map(stage => {
            const stageContacts = contacts.filter(c => c.stage === stage.key);
            return `
                <div class="pipeline-col">
                    <div class="pipeline-col-header">
                        <h4>${stage.label}</h4>
                        <span class="count">${stageContacts.length}</span>
                    </div>
                    ${stageContacts.length === 0 ? '<p style="font-size:12px;color:#9ca3af;text-align:center;padding:20px 0;">No contacts</p>' :
                    stageContacts.map(c => `
                        <div class="pipeline-card">
                            <div class="pipeline-card-name">${this.esc(c.firstName)} ${this.esc(c.lastName)}</div>
                            ${c.dealValue ? `<div class="pipeline-card-value">${this.formatCurrency(c.dealValue)}</div>` : ''}
                            <div class="pipeline-card-actions">
                                ${stage.key !== 'lead' ? `<button onclick="CRM.moveStage('${c.id}','back')">← Back</button>` : ''}
                                ${stage.key !== 'closed_won' ? `<button onclick="CRM.moveStage('${c.id}','forward')">Forward →</button>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }).join('');
    },

    moveStage(id, direction) {
        const stages = ['lead', 'contacted', 'viewing', 'negotiation', 'closed_won'];
        const contacts = this.getContacts();
        const contact = contacts.find(c => c.id === id);
        if (!contact) return;

        const idx = stages.indexOf(contact.stage);
        const newIdx = direction === 'forward' ? idx + 1 : idx - 1;
        if (newIdx < 0 || newIdx >= stages.length) return;

        contact.stage = stages[newIdx];
        contact.updatedAt = new Date().toISOString();
        this.saveContacts(contacts);
        this.renderPipeline();
        this.updateDashboard();
        this.toast(`Moved to ${this.stageName(contact.stage)}`);
    },

    /* ============ PROPERTIES ============ */
    renderProperties() {
        const properties = this.getProperties();
        const grid = document.getElementById('propertiesGrid');

        if (properties.length === 0) {
            grid.innerHTML = '<p class="empty-state">No properties added yet. Click "+ Add Property" to get started.</p>';
            return;
        }

        grid.innerHTML = properties.map(p => `
            <div class="property-crm-card">
                <div class="property-crm-header">
                    <h4>${this.esc(p.address)}</h4>
                    <span>${this.esc(p.category || 'Residential')}</span>
                </div>
                <div class="property-crm-body">
                    <div class="property-crm-detail"><span>Price</span><span>${this.formatCurrency(p.price)}</span></div>
                    <div class="property-crm-detail"><span>Bedrooms</span><span>${p.beds || '—'}</span></div>
                    <div class="property-crm-detail"><span>Bathrooms</span><span>${p.baths || '—'}</span></div>
                    <div class="property-crm-detail"><span>Area</span><span>${p.area ? p.area + 'm²' : '—'}</span></div>
                    <div class="property-crm-detail"><span>Status</span><span>${this.propertyStatus(p.status)}</span></div>
                </div>
                <div class="property-crm-actions">
                    <button class="btn btn-sm btn-secondary" onclick="CRM.editProperty('${p.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="CRM.deleteProperty('${p.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    },

    openPropertyModal(id) {
        document.getElementById('propertyModalTitle').textContent = id ? 'Edit Property' : 'Add Property';
        document.getElementById('propertyModalForm').reset();
        document.getElementById('propertyId').value = '';

        if (id) {
            const p = this.getProperties().find(x => x.id === id);
            if (p) {
                document.getElementById('propertyId').value = p.id;
                document.getElementById('pmAddress').value = p.address || '';
                document.getElementById('pmCategory').value = p.category || 'residential';
                document.getElementById('pmStatus').value = p.status || 'available';
                document.getElementById('pmPrice').value = p.price || '';
                document.getElementById('pmBeds').value = p.beds || '';
                document.getElementById('pmBaths').value = p.baths || '';
                document.getElementById('pmArea').value = p.area || '';
                document.getElementById('pmDescription').value = p.description || '';
            }
        }

        this.openModal('propertyModal');
    },

    editProperty(id) { this.openPropertyModal(id); },

    saveProperty(e) {
        e.preventDefault();
        const properties = this.getProperties();
        const id = document.getElementById('propertyId').value;
        const data = {
            address: document.getElementById('pmAddress').value.trim(),
            category: document.getElementById('pmCategory').value,
            status: document.getElementById('pmStatus').value,
            price: document.getElementById('pmPrice').value,
            beds: document.getElementById('pmBeds').value,
            baths: document.getElementById('pmBaths').value,
            area: document.getElementById('pmArea').value,
            description: document.getElementById('pmDescription').value.trim(),
            updatedAt: new Date().toISOString()
        };

        if (id) {
            const idx = properties.findIndex(p => p.id === id);
            if (idx !== -1) properties[idx] = { ...properties[idx], ...data };
        } else {
            data.id = Date.now().toString();
            data.createdAt = new Date().toISOString();
            properties.push(data);
        }

        this.saveProperties(properties);
        this.closeModal();
        this.renderProperties();
        this.toast(id ? 'Property updated' : 'Property added');
    },

    deleteProperty(id) {
        if (!confirm('Delete this property?')) return;
        const properties = this.getProperties().filter(p => p.id !== id);
        this.saveProperties(properties);
        this.renderProperties();
        this.toast('Property deleted');
    },

    propertyStatus(s) {
        const map = { available: 'Available', under_offer: 'Under Offer', sold: 'Sold' };
        return map[s] || s;
    },

    /* ============ ACTIVITIES ============ */
    renderActivities() {
        const all = this.getAllActivities();
        const timeline = document.getElementById('activityTimeline');

        if (all.length === 0) {
            timeline.innerHTML = '<p class="empty-state">No activities recorded yet. Click "+ Log Activity" to get started.</p>';
            return;
        }

        timeline.innerHTML = all.map(a => `
            <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                    <div class="timeline-meta">
                        <span class="timeline-type">${this.esc(a.type)}</span>
                        <span>${this.timeAgo(a.date)}</span>
                        ${a.contactName ? `<span class="timeline-contact">${this.esc(a.contactName)}</span>` : ''}
                    </div>
                    <p class="timeline-desc">${this.esc(a.description)}</p>
                </div>
            </div>
        `).join('');
    },

    openActivityModal() {
        document.getElementById('activityModalForm').reset();

        // Populate contact dropdown
        const select = document.getElementById('amContact');
        const contacts = this.getContacts();
        select.innerHTML = '<option value="">— No contact —</option>' +
            contacts.map(c => `<option value="${c.id}">${this.esc(c.firstName)} ${this.esc(c.lastName)}</option>`).join('');

        this.openModal('activityModal');
    },

    saveActivity(e) {
        e.preventDefault();
        const type = document.getElementById('amType').value;
        const contactId = document.getElementById('amContact').value;
        const description = document.getElementById('amDescription').value.trim();

        const activity = {
            id: Date.now().toString(),
            type,
            description,
            date: new Date().toISOString()
        };

        if (contactId) {
            const contacts = this.getContacts();
            const contact = contacts.find(c => c.id === contactId);
            if (contact) {
                if (!contact.activities) contact.activities = [];
                contact.activities.push(activity);
                contact.updatedAt = new Date().toISOString();
                this.saveContacts(contacts);
            }
            activity.contactName = contact ? contact.firstName + ' ' + contact.lastName : '';
        }

        const activities = this.getActivities();
        activities.push(activity);
        this.saveActivities(activities);

        this.closeModal();
        this.renderActivities();
        this.updateDashboard();
        this.toast('Activity logged');
    },

    /* ============ ANALYTICS ============ */
    renderAnalytics() {
        const contacts = this.getContacts();
        const activities = this.getAllActivities();

        // Stages chart
        const stages = ['lead', 'contacted', 'viewing', 'negotiation', 'closed_won', 'closed_lost'];
        const stageCounts = stages.map(s => ({ stage: s, count: contacts.filter(c => c.stage === s).length }));
        const maxStage = Math.max(...stageCounts.map(s => s.count), 1);

        document.getElementById('chartStages').innerHTML = `<div class="bar-chart">${stageCounts.map(s => `
            <div class="bar-group">
                <span class="bar-value">${s.count}</span>
                <div class="bar" style="height:${Math.max((s.count / maxStage) * 100, 5)}%"></div>
                <span class="bar-label">${this.stageName(s.stage)}</span>
            </div>
        `).join('')}</div>`;

        // Sources chart
        const sources = ['website', 'referral', 'open_home', 'phone', 'social', 'other'];
        const sourceCounts = sources.map(s => ({ source: s, count: contacts.filter(c => c.source === s).length }));
        const maxSource = Math.max(...sourceCounts.map(s => s.count), 1);

        document.getElementById('chartSources').innerHTML = `<div class="bar-chart">${sourceCounts.map(s => `
            <div class="bar-group">
                <span class="bar-value">${s.count}</span>
                <div class="bar" style="height:${Math.max((s.count / maxSource) * 100, 5)}%"></div>
                <span class="bar-label">${this.esc(s.source)}</span>
            </div>
        `).join('')}</div>`;

        // Monthly activity
        const months = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({ label: d.toLocaleDateString('en-NZ', { month: 'short' }), year: d.getFullYear(), month: d.getMonth() });
        }
        const monthlyCounts = months.map(m => ({
            ...m,
            count: activities.filter(a => {
                const d = new Date(a.date);
                return d.getMonth() === m.month && d.getFullYear() === m.year;
            }).length
        }));
        const maxMonth = Math.max(...monthlyCounts.map(m => m.count), 1);

        document.getElementById('chartMonthly').innerHTML = `<div class="bar-chart">${monthlyCounts.map(m => `
            <div class="bar-group">
                <span class="bar-value">${m.count}</span>
                <div class="bar" style="height:${Math.max((m.count / maxMonth) * 100, 5)}%"></div>
                <span class="bar-label">${m.label}</span>
            </div>
        `).join('')}</div>`;

        // Conversion metrics
        const total = contacts.length || 1;
        const won = contacts.filter(c => c.stage === 'closed_won').length;
        const lost = contacts.filter(c => c.stage === 'closed_lost').length;
        const active = contacts.filter(c => c.status === 'active' && c.stage !== 'closed_won' && c.stage !== 'closed_lost').length;
        const totalValue = contacts.filter(c => c.stage === 'closed_won').reduce((s, c) => s + (Number(c.dealValue) || 0), 0);

        document.getElementById('conversionMetrics').innerHTML = `
            <div class="metric-row"><span>Total Contacts</span><span>${contacts.length}</span></div>
            <div class="metric-row"><span>Active Pipeline</span><span>${active}</span></div>
            <div class="metric-row"><span>Won Deals</span><span>${won}</span></div>
            <div class="metric-row"><span>Lost Deals</span><span>${lost}</span></div>
            <div class="metric-row"><span>Win Rate</span><span>${((won / Math.max(won + lost, 1)) * 100).toFixed(1)}%</span></div>
            <div class="metric-row"><span>Won Value</span><span>${this.formatCurrency(totalValue)}</span></div>
        `;
    },

    /* ============ MODALS ============ */
    openModal(modalId) {
        document.getElementById('modalOverlay').classList.add('open');
        document.getElementById(modalId).classList.add('open');
    },

    closeModal() {
        document.getElementById('modalOverlay').classList.remove('open');
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));
    },

    /* ============ IMPORT / EXPORT ============ */
    exportCSV() {
        const contacts = this.getContacts();
        if (contacts.length === 0) return this.toast('No contacts to export', 'error');

        const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Stage', 'Source', 'Deal Value', 'Status', 'Created', 'Notes'];
        const rows = contacts.map(c => [
            c.firstName, c.lastName, c.email, c.phone, c.stage, c.source, c.dealValue || '', c.status, c.createdAt, c.notes || ''
        ]);

        const csv = [headers, ...rows].map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
        this.download(csv, 'maxwell-crm-contacts.csv', 'text/csv');
        this.toast('CSV exported');
    },

    exportJSON() {
        const data = {
            contacts: this.getContacts(),
            properties: this.getProperties(),
            activities: this.getActivities(),
            exportDate: new Date().toISOString()
        };
        this.download(JSON.stringify(data, null, 2), 'maxwell-crm-backup.json', 'application/json');
        this.toast('JSON backup exported');
    },

    importCSV(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const lines = e.target.result.split('\n').filter(l => l.trim());
            if (lines.length < 2) return this.toast('Empty CSV file', 'error');

            const headers = this.parseCSVLine(lines[0]);
            const contacts = this.getContacts();

            for (let i = 1; i < lines.length; i++) {
                const values = this.parseCSVLine(lines[i]);
                const obj = {};
                headers.forEach((h, idx) => { obj[h.trim().toLowerCase().replace(/\s+/g, '')] = (values[idx] || '').trim(); });

                contacts.push({
                    id: Date.now().toString() + i,
                    firstName: obj.firstname || obj.first || obj.name || '',
                    lastName: obj.lastname || obj.last || '',
                    email: obj.email || '',
                    phone: obj.phone || obj.mobile || '',
                    stage: obj.stage || 'lead',
                    source: obj.source || 'other',
                    dealValue: obj.dealvalue || obj.value || '',
                    status: 'active',
                    notes: obj.notes || '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    activities: []
                });
            }

            this.saveContacts(contacts);
            this.renderContacts();
            this.updateDashboard();
            this.toast(`Imported ${lines.length - 1} contacts`);
        };
        reader.readAsText(file);
        event.target.value = '';
    },

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
                else { inQuotes = !inQuotes; }
            } else if (ch === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += ch;
            }
        }
        result.push(current);
        return result;
    },

    importJSON(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.contacts) this.saveContacts(data.contacts);
                if (data.properties) this.saveProperties(data.properties);
                if (data.activities) this.saveActivities(data.activities);
                this.updateDashboard();
                this.renderContacts();
                this.toast('JSON backup restored');
            } catch {
                this.toast('Invalid JSON file', 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    },

    download(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    },

    /* ============ DEMO DATA ============ */
    loadDemoData() {
        const demoContacts = [
            { id: 'd1', firstName: 'James', lastName: 'Richardson', email: 'james@email.co.nz', phone: '021 555 0101', stage: 'closed_won', source: 'referral', dealValue: 6450000, status: 'active', notes: 'Sold Herne Bay property', createdAt: '2026-01-15T10:00:00Z', updatedAt: '2026-03-01T10:00:00Z', activities: [{ type: 'call', description: 'Initial consultation about selling Herne Bay home', date: '2026-01-15T10:00:00Z' }] },
            { id: 'd2', firstName: 'Michael', lastName: 'Chen', email: 'michael.chen@email.com', phone: '021 555 0102', stage: 'negotiation', source: 'website', dealValue: 4800000, status: 'active', notes: 'Interested in Viaduct Penthouse', createdAt: '2026-02-20T14:00:00Z', updatedAt: '2026-03-10T14:00:00Z', activities: [{ type: 'viewing', description: 'Viewed Viaduct Penthouse Suite', date: '2026-02-28T14:00:00Z' }] },
            { id: 'd3', firstName: 'Sarah', lastName: 'Henderson', email: 'sarah.h@email.co.nz', phone: '021 555 0103', stage: 'viewing', source: 'open_home', dealValue: 7250000, status: 'active', notes: 'Looking for waterfront property', createdAt: '2026-02-25T09:00:00Z', updatedAt: '2026-03-08T09:00:00Z', activities: [] },
            { id: 'd4', firstName: 'David', lastName: 'Thompson', email: 'david.t@email.co.nz', phone: '021 555 0104', stage: 'contacted', source: 'social', dealValue: 5600000, status: 'active', notes: 'Rural property enquiry via Instagram', createdAt: '2026-03-01T11:00:00Z', updatedAt: '2026-03-05T11:00:00Z', activities: [] },
            { id: 'd5', firstName: 'Emma', lastName: 'Williams', email: 'emma.w@email.co.nz', phone: '021 555 0105', stage: 'lead', source: 'website', dealValue: 0, status: 'active', notes: 'First home buyer enquiry', createdAt: '2026-03-10T16:00:00Z', updatedAt: '2026-03-10T16:00:00Z', activities: [] },
            { id: 'd6', firstName: 'Robert', lastName: 'Kim', email: 'robert.kim@email.com', phone: '021 555 0106', stage: 'closed_won', source: 'referral', dealValue: 8900000, status: 'active', notes: 'Purchased Waiheke vineyard estate', createdAt: '2025-11-05T10:00:00Z', updatedAt: '2026-01-20T10:00:00Z', activities: [{ type: 'meeting', description: 'Settlement completed - Waiheke Island property', date: '2026-01-20T10:00:00Z' }] },
            { id: 'd7', firstName: 'Lisa', lastName: 'Patel', email: 'lisa.p@email.co.nz', phone: '021 555 0107', stage: 'lead', source: 'phone', dealValue: 0, status: 'active', notes: 'Called about market appraisal for Devonport home', createdAt: '2026-03-11T14:30:00Z', updatedAt: '2026-03-11T14:30:00Z', activities: [] },
            { id: 'd8', firstName: 'Andrew', lastName: 'Stewart', email: 'andrew.s@email.co.nz', phone: '021 555 0108', stage: 'viewing', source: 'open_home', dealValue: 6100000, status: 'active', notes: 'Loved the Matakana Wine Estate', createdAt: '2026-02-15T10:00:00Z', updatedAt: '2026-03-06T10:00:00Z', activities: [{ type: 'viewing', description: 'Attended Matakana open home - very interested', date: '2026-03-06T10:00:00Z' }] },
            { id: 'd9', firstName: 'Rachel', lastName: 'Nguyen', email: 'rachel.n@email.com', phone: '021 555 0109', stage: 'closed_lost', source: 'website', dealValue: 4800000, status: 'inactive', notes: 'Chose another agent', createdAt: '2026-01-08T09:00:00Z', updatedAt: '2026-02-15T09:00:00Z', activities: [] },
            { id: 'd10', firstName: 'Tom', lastName: 'Wallace', email: 'tom.w@email.co.nz', phone: '021 555 0110', stage: 'negotiation', source: 'referral', dealValue: 5600000, status: 'active', notes: 'Making offer on Kumeu Country Manor', createdAt: '2026-02-01T13:00:00Z', updatedAt: '2026-03-12T13:00:00Z', activities: [{ type: 'offer', description: 'Submitted conditional offer on Kumeu property', date: '2026-03-12T13:00:00Z' }] }
        ];

        const demoProperties = [
            { id: 'p1', address: '42 Marine Parade, Takapuna', category: 'waterfront', status: 'available', price: 6450000, beds: 5, baths: 4, area: 680, description: 'Stunning waterfront estate with panoramic harbour views', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z' },
            { id: 'p2', address: '18 Vineyard Lane, Waiheke Island', category: 'lifestyle', status: 'sold', price: 8900000, beds: 4, baths: 3, area: 24000, description: 'Premier vineyard estate with established vines', createdAt: '2025-11-01T00:00:00Z', updatedAt: '2026-01-20T00:00:00Z' },
            { id: 'p3', address: 'Level 32, Viaduct Tower, Auckland CBD', category: 'urban', status: 'under_offer', price: 4800000, beds: 3, baths: 2, area: 240, description: 'Luxury penthouse with 360° city and harbour views', createdAt: '2026-02-01T00:00:00Z', updatedAt: '2026-03-10T00:00:00Z' },
            { id: 'p4', address: '156 Old North Road, Kumeu', category: 'rural', status: 'available', price: 5600000, beds: 7, baths: 5, area: 52000, description: 'Grand country manor on 5.2 hectares', createdAt: '2026-01-15T00:00:00Z', updatedAt: '2026-03-05T00:00:00Z' }
        ];

        this.saveContacts(demoContacts);
        this.saveProperties(demoProperties);
        this.updateDashboard();
        this.renderContacts();
        this.toast('Demo data loaded — 10 contacts & 4 properties');
    },

    clearAllData() {
        if (!confirm('This will delete ALL contacts, properties, and activities. Are you sure?')) return;
        localStorage.removeItem(this.KEYS.contacts);
        localStorage.removeItem(this.KEYS.properties);
        localStorage.removeItem(this.KEYS.activities);
        this.updateDashboard();
        this.renderContacts();
        this.toast('All data cleared');
    },

    /* ============ HELPERS ============ */
    stageName(s) {
        const map = { lead: 'Lead', contacted: 'Contacted', viewing: 'Viewing', negotiation: 'Negotiation', closed_won: 'Closed Won', closed_lost: 'Closed Lost' };
        return map[s] || s;
    },

    esc(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => CRM.init());
