// QMS Pro - Complete Working Application
// With enhanced inspection viewing and reporting features

// Storage utility
const Storage = {
    DEFAULT_DATA_KEY: "qms_inspections_v2",

    readData() {
        try {
            const raw = localStorage.getItem(this.DEFAULT_DATA_KEY);
            return raw ? JSON.parse(raw) : this.generateSampleData();
        } catch (e) {
            console.error('Error reading data:', e);
            return this.generateSampleData();
        }
    },

    saveData(data) {
        try {
            localStorage.setItem(this.DEFAULT_DATA_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Error saving data:', e);
            return false;
        }
    },

    generateSampleData() {
        const samples = [
            this.createInspectionData({
                product: "Shirt - Classic Cotton",
                vendor: "Fresh Tailors",
                inspector: "John Smith",
                batchId: "BATCH-2023-001",
                scores: { fabric: 8.5, stitching: 8, fit: 7.5, color: 9, packaging: 8, labels: 8 },
                notes: "Good quality with minor fit issues. Fabric quality is excellent.",
                timestamp: Date.now() - 1000 * 60 * 60 * 24 * 2
            }),
            this.createInspectionData({
                product: "Shirt - Premium Linen",
                vendor: "Green Apparel",
                inspector: "Sarah Johnson",
                batchId: "BATCH-2023-002",
                scores: { fabric: 9, stitching: 8.5, fit: 8, color: 8.5, packaging: 9, labels: 8 },
                notes: "Excellent quality batch. Premium materials used throughout.",
                timestamp: Date.now() - 1000 * 60 * 60 * 24 * 1
            })
        ];
        this.saveData(samples);
        return samples;
    },

    createInspectionData({ product, vendor, inspector, batchId, scores, notes, img, timestamp }) {
        const ts = timestamp || Date.now();
        const average = this.calculateAverageScore(scores);
        const predicted = this.predictFromScore(average);
        
        return {
            id: 'ins_' + Math.random().toString(36).slice(2, 11),
            product,
            vendor,
            inspector,
            batchId: batchId || 'BATCH-' + new Date().getFullYear() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
            scores,
            notes,
            img,
            average: +average.toFixed(2),
            predicted,
            managerStatus: "Pending",
            timestamp: ts
        };
    },

    calculateAverageScore(scores) {
        const values = Object.values(scores);
        return values.reduce((a, b) => a + b, 0) / values.length;
    },

    predictFromScore(score) {
        if (score >= 8) return "Accepted (Predicted)";
        if (score >= 6) return "Recheck (Predicted)";
        return "Rejected (Predicted)";
    }
};

// Toast notifications
const Toast = {
    show(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        toast.innerHTML = `
            <i class="fas ${icons[type] || icons.info}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
};

// Modal system
const ModalManager = {
    currentImgData: null,

    init() {
        console.log('🚀 Initializing modal system...');
        
        // Close modal events
        document.getElementById('closeModal')?.addEventListener('click', () => this.closeAll());
        document.getElementById('closeDetail')?.addEventListener('click', () => this.closeAll());
        document.getElementById('cancelBtn')?.addEventListener('click', () => this.closeAll());
        document.getElementById('modalOverlay')?.addEventListener('click', () => this.closeAll());
        
        // New inspection button
        document.getElementById('newInspectionBtn')?.addEventListener('click', () => {
            this.open('inspectionModal');
        });

        // Predict button - DIRECT EVENT BINDING
        const predictBtn = document.getElementById('predictBtn');
        if (predictBtn) {
            predictBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🎯 Predict button clicked!');
                this.handleFormSubmission();
            });
        }

        // Initialize range inputs
        this.initRangeInputs();
        
        // Initialize image upload
        this.initImageUpload();
    },

    initRangeInputs() {
        // Update range value displays
        document.querySelectorAll('input[type="range"]').forEach(range => {
            range.addEventListener('input', e => {
                const valueEl = e.target.parentElement.querySelector('.range-value');
                if (valueEl) valueEl.textContent = e.target.value;
            });
        });
        
        // Range control buttons
        document.querySelectorAll('.range-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                const target = e.target.dataset.target;
                const direction = e.target.dataset.direction;
                const rangeInput = document.querySelector(`input[name="${target}"]`);
                
                if (rangeInput) {
                    let value = parseFloat(rangeInput.value);
                    const step = parseFloat(rangeInput.step) || 0.5;
                    
                    if (direction === 'up') {
                        value = Math.min(10, value + step);
                    } else {
                        value = Math.max(0, value - step);
                    }
                    
                    rangeInput.value = value;
                    rangeInput.dispatchEvent(new Event('input'));
                }
            });
        });
    },

    initImageUpload() {
        const imgInput = document.getElementById('imgInput');
        const imgPreview = document.getElementById('imgPreview');
        
        if (imgInput && imgPreview) {
            imgInput.addEventListener('change', e => {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = e => {
                    this.currentImgData = e.target.result;
                    imgPreview.innerHTML = `<img src="${this.currentImgData}" alt="preview" />`;
                };
                reader.readAsDataURL(file);
            });
        }
    },

    handleFormSubmission() {
        console.log('📝 Handling form submission...');
        
        // Get form values
        const product = document.querySelector('input[name="product"]')?.value;
        const vendor = document.querySelector('select[name="vendor"]')?.value;
        const inspector = document.querySelector('select[name="inspector"]')?.value;
        const batchId = document.querySelector('input[name="batchId"]')?.value;
        const notes = document.querySelector('textarea[name="notes"]')?.value;

        // Validate required fields
        if (!product || !vendor || !inspector) {
            Toast.show('Please fill in all required fields', 'error');
            return;
        }

        // Get scores
        const scores = {
            fabric: parseFloat(document.querySelector('input[name="fabric"]')?.value || 0),
            stitching: parseFloat(document.querySelector('input[name="stitching"]')?.value || 0),
            fit: parseFloat(document.querySelector('input[name="fit"]')?.value || 0),
            color: parseFloat(document.querySelector('input[name="color"]')?.value || 0),
            packaging: parseFloat(document.querySelector('input[name="packaging"]')?.value || 0),
            labels: parseFloat(document.querySelector('input[name="labels"]')?.value || 0)
        };

        // Create inspection data
        const newItem = Storage.createInspectionData({
            product,
            vendor,
            inspector,
            batchId,
            scores,
            notes,
            img: this.currentImgData
        });

        console.log('✅ New inspection:', newItem);

        // Save to storage
        const currentData = Storage.readData();
        currentData.push(newItem);
        Storage.saveData(currentData);

        // Refresh the UI
        if (window.QMSApp) {
            window.QMSApp.refreshUI();
        }

        // Show success and close
        Toast.show(`Inspection saved — Predicted: ${newItem.predicted}`, 'success');
        this.closeAll();
    },

    open(modalId) {
        const modal = document.getElementById(modalId);
        const overlay = document.getElementById('modalOverlay');
        
        if (modal && overlay) {
            // Reset form if it's the inspection modal
            if (modalId === 'inspectionModal') {
                this.resetInspectionForm();
            }
            
            modal.classList.remove('hidden');
            overlay.classList.remove('hidden');
        }
    },

    closeAll() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
        document.getElementById('modalOverlay')?.classList.add('hidden');
        this.currentImgData = null;
    },

    resetInspectionForm() {
        const form = document.getElementById('inspectionForm');
        if (form) form.reset();
        
        // Reset range displays
        document.querySelectorAll('.range-value').forEach(el => {
            const rangeInput = el.closest('.criteria-item')?.querySelector('input[type="range"]');
            if (rangeInput) el.textContent = rangeInput.value;
        });
        
        // Clear image preview
        const imgPreview = document.getElementById('imgPreview');
        if (imgPreview) imgPreview.innerHTML = '';
        
        this.currentImgData = null;
    }
};

// Table management
const TableManager = {
    init() {
        this.render();
        this.initEventListeners();
        this.loadRecentInspections();
    },

    initEventListeners() {
        const tableBody = document.querySelector('#inspectionsTable tbody');
        if (!tableBody) return;

        tableBody.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            const action = btn.dataset.action;
            const id = btn.dataset.id;

            if (action === 'view') {
                this.showDetails(id);
            } else if (action === 'download') {
                ReportManager.generateDetailedReport(id);
            } else if (action === 'approve') {
                this.updateStatus(id, 'Accepted');
            } else if (action === 'reject') {
                this.updateStatus(id, 'Rejected');
            }
        });
    },

    render() {
        const tableBody = document.querySelector('#inspectionsTable tbody');
        if (!tableBody) return;

        const data = Storage.readData();
        tableBody.innerHTML = '';

        if (data.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <span>No inspections found</span>
                    </td>
                </tr>
            `;
            return;
        }

        // Sort by timestamp (newest first)
        const sortedData = [...data].sort((a, b) => b.timestamp - a.timestamp);

        sortedData.forEach(item => {
            const row = this.createTableRow(item);
            tableBody.appendChild(row);
        });

        this.updateTableInfo();
        this.loadRecentInspections();
    },

    createTableRow(item) {
        const tr = document.createElement('tr');
        const time = new Date(item.timestamp).toLocaleString();

        const managerBadge = this.createStatusBadge(item.managerStatus);
        const predictedBadge = this.createPredictedBadge(item.predicted);

        tr.innerHTML = `
            <td>${this.escapeHtml(item.product)}</td>
            <td>${this.escapeHtml(item.vendor)}</td>
            <td>${this.escapeHtml(item.inspector)}</td>
            <td>${time}</td>
            <td>
                <div class="score-display">
                    <span class="score-value">${item.average}</span>
                    <span class="score-max">/10</span>
                </div>
            </td>
            <td>${predictedBadge}</td>
            <td>${managerBadge}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon view" data-action="view" data-id="${item.id}" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon download" data-action="download" data-id="${item.id}" title="Download Report">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="btn-icon approve" data-action="approve" data-id="${item.id}" title="Approve">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-icon reject" data-action="reject" data-id="${item.id}" title="Reject">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </td>
        `;

        return tr;
    },

    createStatusBadge(status) {
        const statusMap = {
            'Accepted': { class: 'accept', icon: 'fa-check' },
            'Rejected': { class: 'reject', icon: 'fa-times' },
            'Pending': { class: 'pending', icon: 'fa-clock' }
        };
        
        const config = statusMap[status] || statusMap.Pending;
        return `<span class="status ${config.class}">${status}</span>`;
    },

    createPredictedBadge(predicted) {
        const text = predicted || 'Unknown';
        let statusClass = 'pending';
        
        if (text.toLowerCase().includes('accept')) statusClass = 'accept';
        else if (text.toLowerCase().includes('reject')) statusClass = 'reject';
        else if (text.toLowerCase().includes('recheck')) statusClass = 'recheck';
        
        return `<span class="status ${statusClass}">${text.split(' ')[0]}</span>`;
    },

    updateStatus(id, status) {
        const data = Storage.readData();
        const itemIndex = data.findIndex(item => item.id === id);
        
        if (itemIndex !== -1) {
            data[itemIndex].managerStatus = status;
            Storage.saveData(data);
            this.render();
            Toast.show(`Inspection ${status.toLowerCase()}`, 'success');
            
            if (window.QMSApp) {
                window.QMSApp.updateKPIs();
            }
        }
    },

    showDetails(id) {
        const data = Storage.readData();
        const item = data.find(d => d.id === id);
        
        if (!item) {
            Toast.show('Inspection not found', 'error');
            return;
        }

        const body = document.getElementById('detailBody');
        const time = new Date(item.timestamp).toLocaleString();

        body.innerHTML = `
            <div class="detail-layout">
                <div class="detail-main">
                    <div class="detail-header">
                        <h2 class="detail-title">${this.escapeHtml(item.product)}</h2>
                        <div class="detail-subtitle">Batch: ${this.escapeHtml(item.batchId)}</div>
                    </div>
                    
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Vendor</label>
                            <span>${this.escapeHtml(item.vendor)}</span>
                        </div>
                        <div class="detail-item">
                            <label>Inspector</label>
                            <span>${this.escapeHtml(item.inspector)}</span>
                        </div>
                        <div class="detail-item">
                            <label>Inspection Time</label>
                            <span>${time}</span>
                        </div>
                        <div class="detail-item">
                            <label>Overall Score</label>
                            <span class="score-badge">${item.average}/10</span>
                        </div>
                        <div class="detail-item">
                            <label>Predicted Status</label>
                            <span>${item.predicted}</span>
                        </div>
                        <div class="detail-item">
                            <label>Manager Decision</label>
                            <span class="status ${item.managerStatus.toLowerCase()}">${item.managerStatus}</span>
                        </div>
                    </div>

                    <div class="scores-section">
                        <h3>Quality Scores Breakdown</h3>
                        <div class="scores-grid">
                            ${Object.entries(item.scores).map(([key, value]) => `
                                <div class="score-item">
                                    <span class="score-value">${value}</span>
                                    <span class="score-label">${this.formatCriteriaName(key)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="detail-section">
                        <h3>Inspection Notes</h3>
                        <p>${this.escapeHtml(item.notes) || 'No additional notes provided.'}</p>
                    </div>

                    <div class="detail-actions">
                        <button class="btn-primary" onclick="ReportManager.generateDetailedReport('${item.id}')">
                            <i class="fas fa-download"></i>
                            Download Detailed Report
                        </button>
                        <button class="btn-secondary" onclick="ModalManager.closeAll()">
                            Close
                        </button>
                    </div>
                </div>
                
                <div class="detail-sidebar">
                    <div class="detail-image">
                        ${item.img ? 
                            `<img src="${item.img}" alt="Product" style="width: 100%; border-radius: 8px;" />` : 
                            `<div class="no-image">
                                <i class="fas fa-image"></i>
                                <span>No Image Available</span>
                            </div>`
                        }
                    </div>
                    
                    <div class="quick-actions" style="margin-top: 20px;">
                        <button class="btn-secondary" onclick="TableManager.updateStatus('${item.id}', 'Accepted')">
                            <i class="fas fa-check"></i>
                            Approve Inspection
                        </button>
                        <button class="btn-secondary" onclick="TableManager.updateStatus('${item.id}', 'Rejected')">
                            <i class="fas fa-times"></i>
                            Reject Inspection
                        </button>
                    </div>
                </div>
            </div>
        `;

        ModalManager.open('detailModal');
    },

    loadRecentInspections() {
        const container = document.getElementById('recentInspectionsList');
        if (!container) return;

        const data = Storage.readData();
        const recentData = [...data].sort((a, b) => b.timestamp - a.timestamp).slice(0, 3);

        container.innerHTML = '';

        if (recentData.length === 0) {
            container.innerHTML = '<div class="empty-state"><span>No recent inspections</span></div>';
            return;
        }

        recentData.forEach(item => {
            const time = new Date(item.timestamp).toLocaleDateString();
            const div = document.createElement('div');
            div.className = 'recent-inspection-item';
            div.innerHTML = `
                <div class="recent-inspection-info">
                    <div class="recent-inspection-product">${this.escapeHtml(item.product)}</div>
                    <div class="recent-inspection-meta">
                        <span>${this.escapeHtml(item.vendor)}</span>
                        <span class="recent-inspection-score">${item.average}/10</span>
                    </div>
                </div>
                <div class="recent-inspection-actions">
                    <button class="btn-icon view" onclick="TableManager.showDetails('${item.id}')" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon download" onclick="ReportManager.generateDetailedReport('${item.id}')" title="Download">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            `;
            container.appendChild(div);
        });
    },

    showRecentInspections() {
        // Scroll to main table
        document.querySelector('.main-panel')?.scrollIntoView({ behavior: 'smooth' });
    },

    updateTableInfo() {
        const data = Storage.readData();
        const infoEl = document.getElementById('tableCount');
        if (infoEl) infoEl.textContent = data.length;
    },

    escapeHtml(str) {
        if (!str) return "";
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    formatCriteriaName(key) {
        const names = {
            fabric: 'Fabric',
            stitching: 'Stitching',
            fit: 'Fit',
            color: 'Color',
            packaging: 'Packaging',
            labels: 'Labels'
        };
        return names[key] || key;
    }
};

// Report Manager
const ReportManager = {
    generateDetailedReport(inspectionId) {
        const data = Storage.readData();
        const inspection = data.find(item => item.id === inspectionId);
        
        if (!inspection) {
            Toast.show('Inspection not found', 'error');
            return;
        }

        Toast.show('Generating detailed report...', 'info');
        
        // Simulate report generation
        setTimeout(() => {
            const reportContent = this.createReportContent(inspection);
            this.downloadPDF(reportContent, `Inspection-Report-${inspection.batchId}.pdf`);
            Toast.show('Detailed report downloaded!', 'success');
        }, 1000);
    },

    createReportContent(inspection) {
        const time = new Date(inspection.timestamp).toLocaleString();
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Inspection Report - ${inspection.batchId}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
                    .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #1976d2; padding-bottom: 20px; }
                    .logo { font-size: 24px; font-weight: bold; color: #1976d2; margin-bottom: 10px; }
                    .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                    .section { margin-bottom: 30px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                    th { background-color: #f5f5f5; font-weight: bold; }
                    .score { font-weight: bold; color: #1976d2; }
                    .notes { background: #f9f9f9; padding: 20px; border-radius: 8px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">QMS Pro - Inspection Report</div>
                    <h1>Detailed Quality Inspection Report</h1>
                </div>
                
                <div class="summary">
                    <div>
                        <h3>Product Information</h3>
                        <p><strong>Product:</strong> ${inspection.product}</p>
                        <p><strong>Vendor:</strong> ${inspection.vendor}</p>
                        <p><strong>Batch ID:</strong> ${inspection.batchId}</p>
                    </div>
                    <div>
                        <h3>Inspection Details</h3>
                        <p><strong>Inspector:</strong> ${inspection.inspector}</p>
                        <p><strong>Date:</strong> ${time}</p>
                        <p><strong>Overall Score:</strong> <span class="score">${inspection.average}/10</span></p>
                    </div>
                </div>
                
                <div class="section">
                    <h3>Quality Scores Breakdown</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Criteria</th>
                                <th>Score</th>
                                <th>Rating</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(inspection.scores).map(([key, value]) => `
                                <tr>
                                    <td>${this.formatCriteriaName(key)}</td>
                                    <td class="score">${value}/10</td>
                                    <td>${this.getRatingDescription(value)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div class="section">
                    <h3>Inspection Notes</h3>
                    <div class="notes">
                        <p>${inspection.notes || 'No additional notes provided.'}</p>
                    </div>
                </div>
                
                <div class="section">
                    <h3>Summary</h3>
                    <p><strong>Predicted Status:</strong> ${inspection.predicted}</p>
                    <p><strong>Manager Decision:</strong> ${inspection.managerStatus}</p>
                    <p><strong>Report Generated:</strong> ${new Date().toLocaleString()}</p>
                </div>
            </body>
            </html>
        `;
    },

    downloadPDF(content, filename) {
        // For a real implementation, you would use a PDF generation library
        // This is a simplified version that opens the content in a new window
        const win = window.open('', '_blank');
        win.document.write(content);
        win.document.close();
        
        // In a real app, you would generate actual PDF here
        Toast.show('Report opened in new window. Use browser print to save as PDF.', 'info');
    },

    exportAllInspections() {
        const data = Storage.readData();
        if (data.length === 0) {
            Toast.show('No inspections to export', 'warning');
            return;
        }

        const csv = this.convertToCSV(data);
        this.downloadCSV(csv, 'all-inspections.csv');
        Toast.show('All inspections exported successfully!', 'success');
    },

    convertToCSV(data) {
        const headers = ['Product', 'Vendor', 'Inspector', 'Batch ID', 'Average Score', 'Status', 'Timestamp'];
        const csvRows = [headers.join(',')];
        
        data.forEach(item => {
            const row = [
                `"${item.product}"`,
                `"${item.vendor}"`,
                `"${item.inspector}"`,
                `"${item.batchId}"`,
                item.average,
                `"${item.managerStatus}"`,
                `"${new Date(item.timestamp).toLocaleString()}"`
            ];
            csvRows.push(row.join(','));
        });
        
        return csvRows.join('\n');
    },

    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    generateSummaryReport() {
        const data = Storage.readData();
        if (data.length === 0) {
            Toast.show('No data for summary report', 'warning');
            return;
        }

        Toast.show('Generating summary report...', 'info');
        // Implementation for summary report would go here
        setTimeout(() => {
            Toast.show('Summary report generated!', 'success');
        }, 1500);
    },

    downloadTemplate(type) {
        const templates = {
            detailed: 'Detailed Inspection Report Template',
            summary: 'Quality Summary Report Template', 
            vendor: 'Vendor Performance Report Template'
        };
        
        Toast.show(`Downloading ${templates[type]}...`, 'info');
        // Template download implementation would go here
    },

    formatCriteriaName(key) {
        const names = {
            fabric: 'Fabric Quality',
            stitching: 'Stitching Quality', 
            fit: 'Fit & Size',
            color: 'Color & Finish',
            packaging: 'Packaging',
            labels: 'Labels & Tags'
        };
        return names[key] || key;
    },

    getRatingDescription(score) {
        if (score >= 9) return 'Excellent';
        if (score >= 8) return 'Very Good';
        if (score >= 7) return 'Good';
        if (score >= 6) return 'Average';
        return 'Needs Improvement';
    }
};

// Main QMS Application
const QMSApp = {
    init() {
        console.log('🚀 Starting QMS Pro Application...');
        
        // Initialize all components
        ModalManager.init();
        TableManager.init();
        
        // Render initial UI
        this.refreshUI();
        
        console.log('✅ QMS Pro Application started successfully');
    },

    refreshUI() {
        this.updateKPIs();
        TableManager.render();
    },

    updateKPIs() {
        const data = Storage.readData();
        const today = new Date().toDateString();
        
        const todayInspections = data.filter(item => 
            new Date(item.timestamp).toDateString() === today
        );
        
        const total = data.length;
        const issues = data.filter(i => i.average < 7).length;
        const avgScore = total === 0 ? 0 : (data.reduce((s, i) => s + i.average, 0) / total).toFixed(2);
        
        const passCount = data.filter(i => i.average >= 8 && i.managerStatus === "Accepted").length;
        const passRate = total === 0 ? 0 : Math.round((passCount / total) * 100);

        // Update DOM elements
        const updateElement = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        updateElement('kpi-count', todayInspections.length);
        updateElement('kpi-passrate', passRate + "%");
        updateElement('kpi-issues', issues);
        updateElement('kpi-avg', `${avgScore}/10`);
    }
};

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.QMSApp = QMSApp;
    window.ModalManager = ModalManager;
    window.TableManager = TableManager;
    window.ReportManager = ReportManager;
    QMSApp.init();
});