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
    sicSuggestions.innerHTML = matches.map(match => {
        const escapedDesc = match.description.replace(/'/g, "\\'").replace(/"/g, '\\"');
        return `
            <div class="sic-suggestion-item" data-code="${match.code}" data-desc="${escapedDesc}">
                <span class="sic-suggestion-code">${match.code}</span>
                <span>${match.description}</span>
            </div>
        `;
    }).join('');
    
    // Add click handlers to suggestions
    sicSuggestions.querySelectorAll('.sic-suggestion-item').forEach(item => {
        item.addEventListener('click', function() {
            const code = this.getAttribute('data-code');
            const desc = this.getAttribute('data-desc');
            selectSICCode(code, desc);
        });
    });
    
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
            <div class="sic-chip">
                ${code}
                <button type="button" onclick="removeSICCode('${code}')" title="${desc}">×</button>
            </div>
        `;
    }).join('');
}

// Search function
async function searchCompanies(page = 1) {
    const form = document.getElementById('searchForm');
    const formData = new FormData(form);
    
    // Build filters object
    const filters = {};
    
    // Optional keyword
    const keyword = formData.get('keyword');
    if (keyword && keyword.trim()) {
        filters.keyword = keyword.trim();
    }
    
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
        
        row.insertCell(0).textContent = company.company_name || '-';
        row.insertCell(1).textContent = company.company_number || '-';
        
        const statusCell = row.insertCell(2);
        statusCell.textContent = company.status || '-';
        statusCell.className = `status-${company.status}`;
        
        row.insertCell(3).textContent = company.type?.toUpperCase() || '-';
        row.insertCell(4).textContent = formatDate(company.incorporation_date);
        row.insertCell(5).textContent = company.registered_office?.locality || '-';
        row.insertCell(6).textContent = company.registered_office?.postal_code || '-';
        row.insertCell(7).textContent = (company.sic_codes || []).join(', ') || '-';
        
        // Add link to Companies House profile
        const profileUrl = `https://find-and-update.company-information.service.gov.uk/company/${company.company_number}`;
        const linkCell = row.insertCell(8);
        linkCell.innerHTML = `
            <a href="${profileUrl}" target="_blank" rel="noopener noreferrer" class="view-link">
                View
                <i class="material-icons">open_in_new</i>
            </a>
        `;
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
}

// UI Helper functions
function showLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function hideError() {
    document.getElementById('errorMessage').style.display = 'none';
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