/* ============================================
   MAXWELL CRM — CORE ENGINE
   ============================================ */

const CRM = {
    KEYS: {
        contacts: 'maxwell_crm_contacts',
        properties: 'maxwell_crm_properties',
        activities: 'maxwell_crm_activities',
        appointments: 'maxwell_crm_appointments',
        calendarSync: 'maxwell_crm_cal_sync'
    },
    sortField: 'updatedAt',
    sortDir: 'desc',
    calMonth: new Date().getMonth(),
    calYear: new Date().getFullYear(),
    calSelectedDate: new Date().toISOString().split('T')[0],

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
        // Only allow known view names to prevent DOM manipulation
        const allowedViews = ['dashboard', 'contacts', 'pipeline', 'properties', 'activities', 'analytics', 'calendar', 'settings'];
        if (!allowedViews.includes(view)) return;

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
        if (view === 'calendar') this.renderCalendar();
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
                            <button class="btn btn-sm btn-secondary" onclick="CRM.editContact('${this.safeId(c.id)}')">Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="CRM.deleteContact('${this.safeId(c.id)}')">Del</button>
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
                                ${stage.key !== 'lead' ? `<button onclick="CRM.moveStage('${this.safeId(c.id)}','back')">← Back</button>` : ''}
                                ${stage.key !== 'closed_won' ? `<button onclick="CRM.moveStage('${this.safeId(c.id)}','forward')">Forward →</button>` : ''}
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
                    <div class="property-crm-detail"><span>Price</span><span>${p.priceDisplay ? this.esc(p.priceDisplay) : this.formatCurrency(p.price)}</span></div>
                    <div class="property-crm-detail"><span>Bedrooms</span><span>${p.beds || '—'}</span></div>
                    <div class="property-crm-detail"><span>Bathrooms</span><span>${p.baths || '—'}</span></div>
                    ${p.cars ? `<div class="property-crm-detail"><span>Car Parks</span><span>${p.cars}</span></div>` : ''}
                    <div class="property-crm-detail"><span>Area</span><span>${p.area ? p.area + 'm²' : '—'}</span></div>
                    ${p.suburb ? `<div class="property-crm-detail"><span>Suburb</span><span>${this.esc(p.suburb)}</span></div>` : ''}
                    <div class="property-crm-detail"><span>Status</span><span>${this.propertyStatus(p.status)}</span></div>
                </div>
                <div class="property-crm-actions">
                    <button class="btn btn-sm btn-secondary" onclick="CRM.editProperty('${this.safeId(p.id)}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="CRM.deleteProperty('${this.safeId(p.id)}')">Delete</button>
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
                document.getElementById('pmSuburb').value = p.suburb || '';
                document.getElementById('pmCategory').value = p.category || 'residential';
                document.getElementById('pmStatus').value = p.status || 'available';
                document.getElementById('pmPrice').value = p.price || '';
                document.getElementById('pmPriceDisplay').value = p.priceDisplay || '';
                document.getElementById('pmBeds').value = p.beds || '';
                document.getElementById('pmBaths').value = p.baths || '';
                document.getElementById('pmCars').value = p.cars || '';
                document.getElementById('pmArea').value = p.area || '';
                document.getElementById('pmImageUrl').value = p.imageUrl || '';
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
            suburb: document.getElementById('pmSuburb').value.trim(),
            category: document.getElementById('pmCategory').value,
            status: document.getElementById('pmStatus').value,
            price: document.getElementById('pmPrice').value,
            priceDisplay: document.getElementById('pmPriceDisplay').value.trim(),
            beds: document.getElementById('pmBeds').value,
            baths: document.getElementById('pmBaths').value,
            cars: document.getElementById('pmCars').value,
            area: document.getElementById('pmArea').value,
            imageUrl: document.getElementById('pmImageUrl').value.trim(),
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
            contacts.map(c => `<option value="${this.safeId(c.id)}">${this.esc(c.firstName)} ${this.esc(c.lastName)}</option>`).join('');

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
                // Sanitise imported data — ensure IDs are safe and strings are trimmed
                const sanitiseRecord = (r) => {
                    if (!r || typeof r !== 'object') return null;
                    if (r.id) r.id = this.safeId(r.id) || Date.now().toString();
                    return r;
                };
                if (Array.isArray(data.contacts)) this.saveContacts(data.contacts.map(sanitiseRecord).filter(Boolean));
                if (Array.isArray(data.properties)) this.saveProperties(data.properties.map(sanitiseRecord).filter(Boolean));
                if (Array.isArray(data.activities)) this.saveActivities(data.activities.map(sanitiseRecord).filter(Boolean));
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
            { id: 'p1', address: '42 Marine Parade, Takapuna', suburb: 'Takapuna, North Shore', category: 'waterfront', status: 'available', price: 6450000, priceDisplay: 'By Negotiation', beds: 5, baths: 4, cars: 3, area: 680, imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80&auto=format&fit=crop', description: 'Stunning waterfront estate with panoramic harbour views', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z' },
            { id: 'p2', address: '18 Vineyard Lane, Waiheke Island', suburb: 'Waiheke Island', category: 'lifestyle', status: 'sold', price: 8900000, priceDisplay: '', beds: 4, baths: 3, cars: 2, area: 24000, imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80&auto=format&fit=crop', description: 'Premier vineyard estate with established vines', createdAt: '2025-11-01T00:00:00Z', updatedAt: '2026-01-20T00:00:00Z' },
            { id: 'p3', address: 'Level 32, Viaduct Tower, Auckland CBD', suburb: 'Viaduct Harbour, Auckland CBD', category: 'urban', status: 'under_offer', price: 4800000, priceDisplay: '$4,800,000', beds: 3, baths: 2, cars: 2, area: 240, imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80&auto=format&fit=crop', description: 'Luxury penthouse with 360° city and harbour views', createdAt: '2026-02-01T00:00:00Z', updatedAt: '2026-03-10T00:00:00Z' },
            { id: 'p4', address: '156 Old North Road, Kumeu', suburb: 'Kumeu, West Auckland', category: 'rural', status: 'available', price: 5600000, priceDisplay: 'Deadline Sale', beds: 7, baths: 5, cars: 6, area: 52000, imageUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80&auto=format&fit=crop', description: 'Grand country manor on 5.2 hectares', createdAt: '2026-01-15T00:00:00Z', updatedAt: '2026-03-05T00:00:00Z' }
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
        localStorage.removeItem(this.KEYS.appointments);
        localStorage.removeItem(this.KEYS.calendarSync);
        this.updateDashboard();
        this.renderContacts();
        this.toast('All data cleared');
    },

    /* ============ CALENDAR & APPOINTMENTS ============ */
    getAppointments() {
        return JSON.parse(localStorage.getItem(this.KEYS.appointments) || '[]');
    },
    saveAppointments(data) {
        localStorage.setItem(this.KEYS.appointments, JSON.stringify(data));
    },
    getSyncStatus() {
        return JSON.parse(localStorage.getItem(this.KEYS.calendarSync) || '{"google":false,"outlook":false}');
    },
    saveSyncStatus(data) {
        localStorage.setItem(this.KEYS.calendarSync, JSON.stringify(data));
    },

    renderCalendar() {
        this.renderCalendarGrid();
        this.renderDayAppointments();
        this.renderUpcoming();
        this.updateSyncUI();
    },

    renderCalendarGrid() {
        const grid = document.getElementById('calendarGrid');
        const title = document.getElementById('calMonthTitle');
        if (!grid || !title) return;

        const year = this.calYear;
        const month = this.calMonth;
        title.textContent = new Date(year, month).toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrev = new Date(year, month, 0).getDate();
        const today = new Date().toISOString().split('T')[0];
        const appointments = this.getAppointments();

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        let html = days.map(d => `<div class="cal-header">${d}</div>`).join('');

        // Previous month days
        for (let i = firstDay - 1; i >= 0; i--) {
            const day = daysInPrev - i;
            html += `<div class="cal-day other-month">${day}</div>`;
        }

        // Current month days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday = dateStr === today;
            const isSelected = dateStr === this.calSelectedDate;
            const hasAppts = appointments.some(a => a.date === dateStr);
            const classes = ['cal-day'];
            if (isToday) classes.push('today');
            if (isSelected) classes.push('selected');
            if (hasAppts) classes.push('has-appointments');
            html += `<div class="${classes.join(' ')}" onclick="CRM.selectDate('${dateStr}')">${d}</div>`;
        }

        // Next month days to fill grid
        const totalCells = firstDay + daysInMonth;
        const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
        for (let d = 1; d <= remaining; d++) {
            html += `<div class="cal-day other-month">${d}</div>`;
        }

        grid.innerHTML = html;
    },

    selectDate(dateStr) {
        this.calSelectedDate = dateStr;
        this.renderCalendarGrid();
        this.renderDayAppointments();
    },

    calPrev() {
        this.calMonth--;
        if (this.calMonth < 0) { this.calMonth = 11; this.calYear--; }
        this.renderCalendarGrid();
    },

    calNext() {
        this.calMonth++;
        if (this.calMonth > 11) { this.calMonth = 0; this.calYear++; }
        this.renderCalendarGrid();
    },

    renderDayAppointments() {
        const container = document.getElementById('calDayAppointments');
        const titleEl = document.getElementById('calDayTitle');
        if (!container) return;

        const date = new Date(this.calSelectedDate + 'T00:00:00');
        titleEl.textContent = date.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

        const appts = this.getAppointments()
            .filter(a => a.date === this.calSelectedDate)
            .sort((a, b) => a.time.localeCompare(b.time));

        if (appts.length === 0) {
            container.innerHTML = '<p class="empty-state">No appointments for this day.</p>';
            return;
        }

        container.innerHTML = appts.map(a => `
            <div class="appointment-item">
                <div class="appt-time">${this.formatTime(a.time)}</div>
                <div class="appt-details">
                    <div class="appt-title">${this.esc(a.title)}</div>
                    <div class="appt-meta">
                        <span class="appt-type-badge">${this.apptTypeName(a.type)}</span>
                        ${a.location ? ' · ' + this.esc(a.location) : ''}
                        ${a.contactName ? ' · ' + this.esc(a.contactName) : ''}
                        ${a.duration ? ' · ' + a.duration + ' min' : ''}
                    </div>
                </div>
                <div class="appt-actions">
                    <button class="btn btn-sm btn-secondary" onclick="CRM.editAppointment('${this.safeId(a.id)}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="CRM.deleteAppointment('${this.safeId(a.id)}')">Del</button>
                </div>
            </div>
        `).join('');
    },

    renderUpcoming() {
        const container = document.getElementById('upcomingAppointments');
        if (!container) return;

        const today = new Date().toISOString().split('T')[0];
        const upcoming = this.getAppointments()
            .filter(a => a.date >= today)
            .sort((a, b) => a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date))
            .slice(0, 10);

        if (upcoming.length === 0) {
            container.innerHTML = '<p class="empty-state">No upcoming appointments. Click "+ New Appointment" to schedule one.</p>';
            return;
        }

        container.innerHTML = upcoming.map(a => `
            <div class="appointment-item">
                <div class="appt-time">${this.formatDate(a.date + 'T00:00:00')}<br>${this.formatTime(a.time)}</div>
                <div class="appt-details">
                    <div class="appt-title">${this.esc(a.title)}</div>
                    <div class="appt-meta">
                        <span class="appt-type-badge">${this.apptTypeName(a.type)}</span>
                        ${a.location ? ' · ' + this.esc(a.location) : ''}
                        ${a.contactName ? ' · ' + this.esc(a.contactName) : ''}
                    </div>
                </div>
                <div class="appt-actions">
                    <button class="btn btn-sm btn-secondary" onclick="CRM.editAppointment('${this.safeId(a.id)}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="CRM.deleteAppointment('${this.safeId(a.id)}')">Del</button>
                </div>
            </div>
        `).join('');
    },

    openAppointmentModal(id) {
        document.getElementById('appointmentModalTitle').textContent = id ? 'Edit Appointment' : 'New Appointment';
        document.getElementById('appointmentModalForm').reset();
        document.getElementById('appointmentId').value = '';

        // Default date to selected calendar date
        document.getElementById('apptDate').value = this.calSelectedDate || new Date().toISOString().split('T')[0];

        // Populate contacts
        const select = document.getElementById('apptContact');
        const contacts = this.getContacts();
        select.innerHTML = '<option value="">— No contact —</option>' +
            contacts.map(c => `<option value="${this.safeId(c.id)}">${this.esc(c.firstName)} ${this.esc(c.lastName)}</option>`).join('');

        if (id) {
            const a = this.getAppointments().find(x => x.id === id);
            if (a) {
                document.getElementById('appointmentId').value = a.id;
                document.getElementById('apptTitle').value = a.title || '';
                document.getElementById('apptType').value = a.type || 'viewing';
                document.getElementById('apptDate').value = a.date || '';
                document.getElementById('apptTime').value = a.time || '';
                document.getElementById('apptDuration').value = a.duration || '30';
                document.getElementById('apptLocation').value = a.location || '';
                document.getElementById('apptNotes').value = a.notes || '';
                if (a.contactId) document.getElementById('apptContact').value = a.contactId;
            }
        }

        this.openModal('appointmentModal');
    },

    editAppointment(id) { this.openAppointmentModal(id); },

    saveAppointment(e) {
        e.preventDefault();
        const appointments = this.getAppointments();
        const id = document.getElementById('appointmentId').value;
        const contactId = document.getElementById('apptContact').value;
        const contacts = this.getContacts();
        const contact = contactId ? contacts.find(c => c.id === contactId) : null;

        const data = {
            title: document.getElementById('apptTitle').value.trim(),
            type: document.getElementById('apptType').value,
            date: document.getElementById('apptDate').value,
            time: document.getElementById('apptTime').value,
            duration: document.getElementById('apptDuration').value,
            location: document.getElementById('apptLocation').value.trim(),
            notes: document.getElementById('apptNotes').value.trim(),
            contactId: contactId || '',
            contactName: contact ? contact.firstName + ' ' + contact.lastName : '',
            updatedAt: new Date().toISOString()
        };

        if (id) {
            const idx = appointments.findIndex(a => a.id === id);
            if (idx !== -1) appointments[idx] = { ...appointments[idx], ...data };
        } else {
            data.id = Date.now().toString();
            data.createdAt = new Date().toISOString();
            appointments.push(data);
        }

        this.saveAppointments(appointments);
        this.closeModal();
        this.renderCalendar();

        // Sync to connected calendars
        const syncCal = document.getElementById('apptSyncCal').checked;
        const sync = this.getSyncStatus();
        if (syncCal && (sync.google || sync.outlook)) {
            this.syncAppointmentToCalendar(data, sync);
        }

        this.toast(id ? 'Appointment updated' : 'Appointment created');
    },

    deleteAppointment(id) {
        if (!confirm('Delete this appointment?')) return;
        const appointments = this.getAppointments().filter(a => a.id !== id);
        this.saveAppointments(appointments);
        this.renderCalendar();
        this.toast('Appointment deleted');
    },

    /* ============ CALENDAR SYNC ============ */
    connectGoogle() {
        const sync = this.getSyncStatus();
        if (sync.google) {
            sync.google = false;
            this.saveSyncStatus(sync);
            this.updateSyncUI();
            this.toast('Google Calendar disconnected');
            return;
        }

        // In production, this would redirect to Google OAuth2
        // For now, simulate the connection flow
        const confirmed = confirm(
            'Connect to Google Calendar?\n\n' +
            'In production, this will redirect you to Google to authorise access to your calendar.\n\n' +
            'This allows the CRM to:\n' +
            '• Create viewings & appointments in your Google Calendar\n' +
            '• Sync appointment changes both ways\n' +
            '• Send calendar invites to clients\n\n' +
            'Click OK to simulate connecting.'
        );

        if (confirmed) {
            sync.google = true;
            sync.googleEmail = 'sharon@sharonmaxwell.co.nz';
            sync.googleConnectedAt = new Date().toISOString();
            this.saveSyncStatus(sync);
            this.updateSyncUI();
            this.toast('Google Calendar connected');
        }
    },

    connectOutlook() {
        const sync = this.getSyncStatus();
        if (sync.outlook) {
            sync.outlook = false;
            this.saveSyncStatus(sync);
            this.updateSyncUI();
            this.toast('Outlook Calendar disconnected');
            return;
        }

        const confirmed = confirm(
            'Connect to Outlook Calendar?\n\n' +
            'In production, this will redirect you to Microsoft to authorise access via Microsoft Graph API.\n\n' +
            'This allows the CRM to:\n' +
            '• Create viewings & appointments in your Outlook Calendar\n' +
            '• Sync appointment changes both ways\n' +
            '• Send calendar invites to clients\n\n' +
            'Click OK to simulate connecting.'
        );

        if (confirmed) {
            sync.outlook = true;
            sync.outlookEmail = 'sharon@sharonmaxwell.co.nz';
            sync.outlookConnectedAt = new Date().toISOString();
            this.saveSyncStatus(sync);
            this.updateSyncUI();
            this.toast('Outlook Calendar connected');
        }
    },

    updateSyncUI() {
        const sync = this.getSyncStatus();
        const dot = document.querySelector('.sync-dot');
        const text = document.getElementById('syncStatusText');
        const googleBtn = document.querySelector('.btn-google');
        const outlookBtn = document.querySelector('.btn-outlook');

        if (!dot || !text) return;

        const connected = sync.google || sync.outlook;
        dot.classList.toggle('connected', connected);

        if (sync.google && sync.outlook) {
            text.textContent = 'Connected to Google & Outlook';
        } else if (sync.google) {
            text.textContent = 'Connected to Google Calendar';
        } else if (sync.outlook) {
            text.textContent = 'Connected to Outlook';
        } else {
            text.textContent = 'Not connected';
        }

        if (googleBtn) {
            googleBtn.classList.toggle('connected', sync.google);
            googleBtn.innerHTML = sync.google
                ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg> Disconnect Google'
                : '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg> Sync with Google Calendar';
        }
        if (outlookBtn) {
            outlookBtn.classList.toggle('connected', sync.outlook);
            outlookBtn.innerHTML = sync.outlook
                ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 7.387v10.478c0 .23-.08.424-.238.576a.806.806 0 01-.588.233h-8.174v-12.5h8.174c.229 0 .424.079.588.232.159.153.238.347.238.575v.406zM13.5 24L0 22.5V1.5L13.5 0v24zm-3.264-8.166c.697 0 1.266-.291 1.706-.873.441-.581.661-1.345.661-2.291 0-.964-.22-1.735-.661-2.313-.44-.577-1.009-.866-1.706-.866-.714 0-1.29.289-1.73.866-.44.578-.66 1.349-.66 2.313 0 .946.22 1.71.66 2.291.44.582 1.016.873 1.73.873zm-.036 1.478c-1.135 0-2.06-.415-2.776-1.244-.715-.829-1.073-1.891-1.073-3.188 0-1.33.365-2.404 1.094-3.222.73-.817 1.667-1.226 2.813-1.226 1.118 0 2.031.416 2.741 1.248.71.832 1.065 1.898 1.065 3.2 0 1.345-.362 2.417-1.086 3.216-.725.799-1.656 1.198-2.792 1.216h.014zM15 18.174h9V6.174h-9v12z"/></svg> Disconnect Outlook'
                : '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 7.387v10.478c0 .23-.08.424-.238.576a.806.806 0 01-.588.233h-8.174v-12.5h8.174c.229 0 .424.079.588.232.159.153.238.347.238.575v.406zM13.5 24L0 22.5V1.5L13.5 0v24zm-3.264-8.166c.697 0 1.266-.291 1.706-.873.441-.581.661-1.345.661-2.291 0-.964-.22-1.735-.661-2.313-.44-.577-1.009-.866-1.706-.866-.714 0-1.29.289-1.73.866-.44.578-.66 1.349-.66 2.313 0 .946.22 1.71.66 2.291.44.582 1.016.873 1.73.873zm-.036 1.478c-1.135 0-2.06-.415-2.776-1.244-.715-.829-1.073-1.891-1.073-3.188 0-1.33.365-2.404 1.094-3.222.73-.817 1.667-1.226 2.813-1.226 1.118 0 2.031.416 2.741 1.248.71.832 1.065 1.898 1.065 3.2 0 1.345-.362 2.417-1.086 3.216-.725.799-1.656 1.198-2.792 1.216h.014zM15 18.174h9V6.174h-9v12z"/></svg> Sync with Outlook';
        }
    },

    syncAppointmentToCalendar(appt, sync) {
        // In production, this would make API calls to:
        // Google: POST https://www.googleapis.com/calendar/v3/calendars/primary/events
        // Outlook: POST https://graph.microsoft.com/v1.0/me/events
        //
        // The event payload would include:
        // - summary/subject: appt.title
        // - start/end datetime from appt.date + appt.time + appt.duration
        // - location: appt.location
        // - description: appt.notes
        // - attendees: contact email if available

        const targets = [];
        if (sync.google) targets.push('Google Calendar');
        if (sync.outlook) targets.push('Outlook');

        console.log(`[CRM Sync] Syncing "${appt.title}" to: ${targets.join(', ')}`);
        console.log('[CRM Sync] Event details:', {
            title: appt.title,
            date: appt.date,
            time: appt.time,
            duration: appt.duration + ' min',
            location: appt.location
        });

        // Show sync confirmation
        setTimeout(() => {
            this.toast(`Synced to ${targets.join(' & ')}`);
        }, 500);
    },

    formatTime(time) {
        if (!time) return '';
        const [h, m] = time.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${h12}:${m} ${ampm}`;
    },

    apptTypeName(type) {
        const map = {
            viewing: 'Viewing',
            meeting: 'Meeting',
            open_home: 'Open Home',
            appraisal: 'Appraisal',
            signing: 'Signing',
            other: 'Other'
        };
        return map[type] || type;
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
    },

    /** Sanitise an ID for safe use in HTML attribute contexts (onclick, etc.) */
    safeId(id) {
        if (!id) return '';
        return String(id).replace(/[^a-zA-Z0-9_\-]/g, '');
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => CRM.init());
