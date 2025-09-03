#!/bin/bash

# Test Companies House API authentication
echo "Testing Companies House API..."
echo "Please enter your API key:"
read -s API_KEY

echo ""
echo "Testing with company number 00000006..."
curl -XGET -u "$API_KEY:" https://api.company-information.service.gov.uk/company/00000006 -v

echo ""
echo ""
echo "Testing search endpoint..."
curl -XGET -u "$API_KEY:" "https://api.company-information.service.gov.uk/search/companies?q=revolut&items_per_page=5" -v