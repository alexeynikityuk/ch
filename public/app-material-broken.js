// Initialize Material Components
const MDCTextField = mdc.textField.MDCTextField;
const MDCCheckbox = mdc.checkbox.MDCCheckbox;
const MDCRipple = mdc.ripple.MDCRipple;
const MDCChipSet = mdc.chips.MDCChipSet;
const MDCCircularProgress = mdc.circularProgress.MDCCircularProgress;

// Initialize all MDC components
document.addEventListener('DOMContentLoaded', () => {
    // Text fields
    const textFields = document.querySelectorAll('.mdc-text-field');
    textFields.forEach(field => new MDCTextField(field));
    
    // Checkboxes
    const checkboxes = document.querySelectorAll('.mdc-checkbox');
    checkboxes.forEach(checkbox => new MDCCheckbox(checkbox));
    
    // Buttons
    const buttons = document.querySelectorAll('.mdc-button');
    buttons.forEach(button => new MDCRipple(button));
    
    const iconButtons = document.querySelectorAll('.mdc-icon-button');
    iconButtons.forEach(button => {
        const ripple = new MDCRipple(button);
        ripple.unbounded = true;
    });
    
    // Progress indicator
    const progress = document.querySelector('.mdc-circular-progress');
    if (progress) {
        const circularProgress = new MDCCircularProgress(progress);
        circularProgress.determinate = false;
        circularProgress.open();
    }
});

// State management
let currentPage = 1;
let currentFilters = {};
let currentToken = null;
let totalResults = 0;
let pageSize = 20;
let selectedSICCodes = new Set();

// SIC code autocomplete
const sicInput = document.getElementById('sic');
const sicSuggestions = document.getElementById('sicSuggestions');

sicInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    
    if (query.length < 2) {
        sicSuggestions.style.display = 'none';
        return;
    }
    
    const matches = searchSICCodes(query);
    
    if (matches.length === 0) {
        sicSuggestions.style.display = 'none';
        return;
    }
    
    // Build suggestions HTML
    sicSuggestions.innerHTML = matches.map(match => `
        <div class="sic-suggestion-item" onclick="selectSICCode('${match.code}', '${match.description.replace(/'/g, "\\'")}')">
            <span class="sic-suggestion-code">${match.code}</span>
            <span class="sic-suggestion-desc">${match.description}</span>
        </div>
    `).join('');
    
    sicSuggestions.style.display = 'block';
});

// Hide suggestions when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.sic-autocomplete')) {
        sicSuggestions.style.display = 'none';
    }
});

window.selectSICCode = function(code, description) {
    selectedSICCodes.add(code);
    updateSICDisplay();
    sicInput.value = '';
    sicSuggestions.style.display = 'none';
    
    // Re-focus the input
    const textField = sicInput.closest('.mdc-text-field');
    const mdcTextField = MDCTextField.attachTo(textField);
    mdcTextField.focus();
}

window.removeSICCode = function(code) {
    selectedSICCodes.delete(code);
    updateSICDisplay();
}

function updateSICDisplay() {
    const container = document.getElementById('selectedSICCodes');
    container.innerHTML = Array.from(selectedSICCodes).map(code => {
        const mapping = sicCodeMappings.find(m => m.code === code);
        const desc = mapping ? mapping.description : `SIC ${code}`;
        return `
            <div class="mdc-chip" role="row">
                <div class="mdc-chip__ripple"></div>
                <span class="mdc-chip__text">${code}</span>
                <i class="material-icons mdc-chip__icon mdc-chip__icon--trailing" onclick="removeSICCode('${code}')" title="${desc}">cancel</i>
            </div>
        `;
    }).join('');
    
    // Initialize chip ripples
    const chips = container.querySelectorAll('.mdc-chip');
    chips.forEach(chip => new MDCRipple(chip));
}

// Search function
async function searchCompanies(page = 1) {
    const form = document.getElementById('searchForm');
    const formData = new FormData(form);
    
    // Build filters object
    const filters = {};
    
    // Required keyword
    const keyword = formData.get('keyword');
    if (!keyword) {
        showError('Keyword is required for search');
        return;
    }
    filters.keyword = keyword;
    
    // Get selected checkboxes for company status
    const companyStatus = Array.from(document.querySelectorAll('input[name="company_status"]:checked'))
        .map(cb => cb.value);
    if (companyStatus.length > 0) filters.company_status = companyStatus;
    
    // Get selected checkboxes for company type
    const companyType = Array.from(document.querySelectorAll('input[name="company_type"]:checked'))
        .map(cb => cb.value);
    if (companyType.length > 0) filters.company_type = companyType;
    
    // Date fields
    const incorporatedFrom = formData.get('incorporated_from');
    if (incorporatedFrom) filters.incorporated_from = incorporatedFrom;
    
    const incorporatedTo = formData.get('incorporated_to');
    if (incorporatedTo) filters.incorporated_to = incorporatedTo;
    
    // Text fields
    const postcodePrefix = formData.get('postcode_prefix');
    if (postcodePrefix) filters.postcode_prefix = postcodePrefix;
    
    const locality = formData.get('locality');
    if (locality) filters.locality = locality;
    
    // SIC codes
    const sicCodes = getSICCodesForSearch();
    if (sicCodes.length > 0) filters.sic = sicCodes;
    
    // Store current filters
    currentFilters = filters;
    currentPage = page;
    
    // Show loading
    showLoading(true);
    hideError();
    hideResults();
    
    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filters,
                page,
                page_size: pageSize
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Search failed');
        }
        
        const data = await response.json();
        displayResults(data);
        
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

function getSICCodesForSearch() {
    const codes = Array.from(selectedSICCodes);
    
    // Also check if user typed raw codes
    const inputValue = document.getElementById('sic').value.trim();
    if (inputValue) {
        const rawCodes = inputValue.split(',').map(c => c.trim()).filter(c => /^\d{4,5}$/.test(c));
        codes.push(...rawCodes);
    }
    
    return [...new Set(codes)];
}

function displayResults(data) {
    currentToken = data.result_token;
    totalResults = data.total_estimated;
    
    // Update results count
    document.getElementById('totalResults').textContent = totalResults;
    
    // Clear table
    const tbody = document.getElementById('resultsTableBody');
    tbody.innerHTML = '';
    
    // Populate table
    data.items.forEach(company => {
        const row = tbody.insertRow();
        row.classList.add('mdc-data-table__row');
        
        row.insertCell(0).innerHTML = `<div class="mdc-data-table__cell">${company.company_name || '-'}</div>`;
        row.insertCell(1).innerHTML = `<div class="mdc-data-table__cell">${company.company_number || '-'}</div>`;
        
        const statusCell = row.insertCell(2);
        const statusClass = company.status === 'active' ? 'active' : 
                          company.status === 'dissolved' ? 'dissolved' : 'other';
        statusCell.innerHTML = `<div class="mdc-data-table__cell">
            <span class="status-chip ${statusClass}">${company.status || '-'}</span>
        </div>`;
        
        row.insertCell(3).innerHTML = `<div class="mdc-data-table__cell">${company.type?.toUpperCase() || '-'}</div>`;
        row.insertCell(4).innerHTML = `<div class="mdc-data-table__cell">${formatDate(company.incorporation_date)}</div>`;
        row.insertCell(5).innerHTML = `<div class="mdc-data-table__cell">${company.registered_office?.locality || '-'}</div>`;
        row.insertCell(6).innerHTML = `<div class="mdc-data-table__cell">${company.registered_office?.postal_code || '-'}</div>`;
        row.insertCell(7).innerHTML = `<div class="mdc-data-table__cell">${(company.sic_codes || []).join(', ') || '-'}</div>`;
        
        // Add link to Companies House profile
        const profileUrl = `https://find-and-update.company-information.service.gov.uk/company/${company.company_number}`;
        row.insertCell(8).innerHTML = `<div class="mdc-data-table__cell">
            <a href="${profileUrl}" target="_blank" rel="noopener noreferrer" class="mdc-button mdc-button--dense">
                <span class="mdc-button__ripple"></span>
                <i class="material-icons mdc-button__icon" aria-hidden="true">open_in_new</i>
                <span class="mdc-button__label">View</span>
            </a>
        </div>`;
    });
    
    // Update pagination
    const totalPages = Math.ceil(totalResults / pageSize);
    document.getElementById('currentPage').textContent = currentPage;
    document.getElementById('totalPages').textContent = totalPages;
    
    // Enable/disable pagination buttons
    document.getElementById('prevBtn').disabled = currentPage <= 1;
    document.getElementById('nextBtn').disabled = currentPage >= totalPages;
    
    // Show results
    showResults();
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Pagination
window.previousPage = function() {
    if (currentPage > 1) {
        searchCompanies(currentPage - 1);
    }
}

window.nextPage = function() {
    const totalPages = Math.ceil(totalResults / pageSize);
    if (currentPage < totalPages) {
        searchCompanies(currentPage + 1);
    }
}

// Export functionality
window.exportResults = async function(format) {
    if (!currentToken) {
        showError('No results to export');
        return;
    }
    
    try {
        const url = `/api/export?token=${currentToken}&format=${format}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Export failed');
        }
        
        // Get filename from Content-Disposition header or create one
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `companies_export.${format}`;
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="(.+)"/);
            if (filenameMatch) filename = filenameMatch[1];
        }
        
        // Download file
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
        
    } catch (error) {
        showError(error.message);
    }
}

// Reset form
window.resetForm = function() {
    document.getElementById('searchForm').reset();
    hideResults();
    hideError();
    currentToken = null;
    currentFilters = {};
    selectedSICCodes.clear();
    updateSICDisplay();
    
    // Reset Material Design text fields
    const textFields = document.querySelectorAll('.mdc-text-field');
    textFields.forEach(field => {
        const mdcTextField = MDCTextField.attachTo(field);
        mdcTextField.value = '';
    });
}

// UI Helper functions
function showLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

function showError(message) {
    const errorBanner = document.getElementById('errorBanner');
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorBanner.style.display = 'block';
}

window.hideError = function() {
    document.getElementById('errorBanner').style.display = 'none';
}

function showResults() {
    document.getElementById('resultsCard').style.display = 'block';
}

function hideResults() {
    document.getElementById('resultsCard').style.display = 'none';
}

// Form submit handler
document.getElementById('searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    searchCompanies(1);
});