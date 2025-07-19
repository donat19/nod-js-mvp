class PersonalAdsManager {
    constructor() {
        this.currentUser = null;
        this.myAds = [];
        this.favoriteAds = [];
        this.carDataProcessor = new CarDataProcessor();
        this.carData = null;
        this.selectedValues = {};
        this.init();
    }

    async init() {
        try {
            // Check authentication
            const sessionResult = await SessionManager.checkSession();
            if (!sessionResult.authenticated) {
                window.location.href = '/login';
                return;
            }
            
            this.currentUser = sessionResult.user;

            // Load car data first
            await this.loadCarData();

            this.setupEventListeners();
            this.setupTabEventListeners();
            this.setupSmartSelects();
            this.loadMyAds();
            this.loadFavoriteAds();
            this.populateContactInfo();
            this.setupRealTimeValidation();
        } catch (error) {
            console.error('Failed to initialize:', error);
            this.showAlert('Failed to load page', 'error');
        }
    }

    async loadCarData() {
        try {
            this.carData = await this.carDataProcessor.loadCarData();
            console.log('Car data loaded successfully');
        } catch (error) {
            console.error('Failed to load car data:', error);
            this.showAlert('Failed to load car data. Using basic options.', 'warning');
            // Fallback to basic options
            this.carData = this.getBasicCarData();
        }
    }

    getBasicCarData() {
        return {
            makes: {
                'Toyota': { name: 'Toyota', models: { 'Camry': { name: 'Camry' }, 'Corolla': { name: 'Corolla' } } },
                'Honda': { name: 'Honda', models: { 'Civic': { name: 'Civic' }, 'Accord': { name: 'Accord' } } },
                'Ford': { name: 'Ford', models: { 'F-150': { name: 'F-150' }, 'Mustang': { name: 'Mustang' } } }
            },
            bodyTypes: ['Sedan', 'SUV', 'Truck', 'Coupe', 'Hatchback'],
            transmissions: ['Automatic', 'Manual', 'CVT'],
            fuelTypes: ['Gasoline', 'Hybrid', 'Electric', 'Diesel'],
            colors: ['White', 'Black', 'Silver', 'Gray', 'Red', 'Blue'],
            years: Array.from({length: 30}, (_, i) => new Date().getFullYear() - i),
            conditions: [
                { value: 'new', label: 'New' },
                { value: 'used', label: 'Used' },
                { value: 'certified', label: 'Certified Pre-Owned' }
            ]
        };
    }

    setupEventListeners() {
        // Form submission
        const createAdForm = document.getElementById('createAdForm');
        if (createAdForm) {
            createAdForm.addEventListener('submit', (e) => this.handleCreateAd(e));
        }

        // Add example data button listener
        const fillExampleBtn = document.getElementById('fillExampleBtn');
        if (fillExampleBtn) {
            fillExampleBtn.addEventListener('click', () => this.fillExampleData());
        }

        // Event delegation for dynamically created buttons
        document.addEventListener('click', (e) => {
            const button = e.target.closest('[data-action]');
            if (!button) return;

            const action = button.dataset.action;
            const adId = button.dataset.adId;
            const tab = button.dataset.tab;

            switch (action) {
                case 'switchTab':
                    if (tab) this.switchTab(null, tab);
                    break;
                case 'publishAd':
                    if (adId) this.publishAd(adId);
                    break;
                case 'unpublishAd':
                    if (adId) this.unpublishAd(adId);
                    break;
                case 'markAsSold':
                    if (adId) this.markAsSold(adId);
                    break;
                case 'editAd':
                    if (adId) this.editAd(adId);
                    break;
                case 'deleteAd':
                    if (adId) this.deleteAd(adId);
                    break;
                case 'removeFavorite':
                    if (adId) this.removeFavorite(adId);
                    break;
                case 'viewAd':
                    if (adId) this.viewAd(adId);
                    break;
            }
        });

        // Populate contact info from user profile
        this.populateContactInfo();
    }

    setupTabEventListeners() {
        const tabButtons = document.querySelectorAll('.nav-tab');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this.switchTab(e, tabName);
            });
        });
    }

    switchTab(event, tabName) {
        // Hide all tab contents
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => content.classList.remove('active'));

        // Remove active class from all tabs
        const tabs = document.querySelectorAll('.nav-tab');
        tabs.forEach(tab => tab.classList.remove('active'));

        // Show selected tab content
        const selectedContent = document.getElementById(tabName);
        if (selectedContent) {
            selectedContent.classList.add('active');
        }

        // Add active class to selected tab
        if (event && event.target) {
            event.target.classList.add('active');
        }

        // Reload data when switching to My Ads or Favorites
        if (tabName === 'my-ads') {
            this.loadMyAds();
        } else if (tabName === 'favorites') {
            this.loadFavoriteAds();
        }
    }

    setupSmartSelects() {
        // Initialize all smart select components
        const smartSelects = document.querySelectorAll('.smart-select');
        smartSelects.forEach(select => {
            this.initializeSmartSelect(select);
        });

        // Populate initial options
        this.populateSmartSelectOptions();
    }

    initializeSmartSelect(selectElement) {
        const field = selectElement.dataset.field;
        const toggle = selectElement.querySelector('.smart-select-toggle');
        const dropdown = selectElement.querySelector('.smart-select-dropdown');
        const customInput = selectElement.parentElement.querySelector('.custom-input');

        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown(selectElement);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!selectElement.contains(e.target)) {
                this.closeDropdown(selectElement);
            }
        });

        // Handle option selection
        dropdown.addEventListener('click', (e) => {
            if (e.target.classList.contains('smart-select-option')) {
                this.selectOption(selectElement, e.target);
            }
        });
    }

    populateSmartSelectOptions() {
        if (!this.carData) return;

        // Populate makes
        this.populateSelectField('make', Object.keys(this.carData.makes).sort());
        
        // Populate other static fields
        this.populateSelectField('fuel_type', this.carData.fuelTypes || []);
        this.populateSelectField('transmission', this.carData.transmissions || []);
        this.populateSelectField('body_type', this.carData.bodyTypes || []);
        this.populateSelectField('exterior_color', this.carData.colors || []);
        this.populateSelectField('interior_color', this.carData.colors || []);
        this.populateSelectField('year', this.carData.years || []);
    }

    populateSelectField(fieldName, options) {
        const selectElement = document.querySelector(`[data-field="${fieldName}"]`);
        if (!selectElement) return;

        const dropdown = selectElement.querySelector('.smart-select-dropdown');
        dropdown.innerHTML = '';

        // Add predefined options
        options.forEach(option => {
            const optionElement = document.createElement('div');
            optionElement.className = 'smart-select-option';
            optionElement.textContent = option;
            optionElement.dataset.value = option;
            dropdown.appendChild(optionElement);
        });

        // Add custom option
        const customOption = document.createElement('div');
        customOption.className = 'smart-select-option custom';
        customOption.textContent = '✏️ Enter custom value';
        customOption.dataset.value = 'custom';
        dropdown.appendChild(customOption);
    }

    toggleDropdown(selectElement) {
        const dropdown = selectElement.querySelector('.smart-select-dropdown');
        const toggle = selectElement.querySelector('.smart-select-toggle');
        
        // Close all other dropdowns
        document.querySelectorAll('.smart-select-dropdown.show').forEach(d => {
            if (d !== dropdown) d.classList.remove('show');
        });
        document.querySelectorAll('.smart-select-toggle.active').forEach(t => {
            if (t !== toggle) t.classList.remove('active');
        });

        dropdown.classList.toggle('show');
        toggle.classList.toggle('active');
    }

    closeDropdown(selectElement) {
        const dropdown = selectElement.querySelector('.smart-select-dropdown');
        const toggle = selectElement.querySelector('.smart-select-toggle');
        dropdown.classList.remove('show');
        toggle.classList.remove('active');
    }

    selectOption(selectElement, optionElement) {
        const field = selectElement.dataset.field;
        const value = optionElement.dataset.value;
        const toggle = selectElement.querySelector('.smart-select-toggle .selected-text');
        const customInput = selectElement.parentElement.querySelector('.custom-input');
        const hiddenInput = selectElement.parentElement.querySelector('input[type="text"], input[type="number"]');

        if (value === 'custom') {
            // Show custom input
            customInput.classList.add('show');
            toggle.textContent = 'Custom value...';
            this.selectedValues[field] = '';
            
            // Focus on custom input
            const input = customInput.querySelector('input');
            if (input) {
                input.focus();
                input.addEventListener('input', (e) => {
                    this.selectedValues[field] = e.target.value;
                    this.handleFieldChange(field, e.target.value);
                });
            }
        } else {
            // Hide custom input and set predefined value
            customInput.classList.remove('show');
            toggle.textContent = value;
            this.selectedValues[field] = value;
            
            // Set hidden input value
            if (hiddenInput) {
                hiddenInput.value = value;
            }

            this.handleFieldChange(field, value);
        }

        this.closeDropdown(selectElement);
    }

    handleFieldChange(field, value) {
        // Handle cascading changes
        if (field === 'make') {
            this.updateModelOptions(value);
            this.clearField('model');
            this.clearSpecs();
        } else if (field === 'model') {
            this.clearSpecs();
        }

        // Update vehicle specs if we have make, model, and year
        if (this.selectedValues.make && this.selectedValues.model && this.selectedValues.year) {
            this.updateVehicleSpecs();
        }
    }

    updateModelOptions(makeName) {
        const make = this.carData.makes[makeName];
        if (!make || !make.models) {
            this.populateSelectField('model', []);
            return;
        }

        const models = Object.keys(make.models).sort();
        this.populateSelectField('model', models);
        
        // Update model toggle text
        const modelSelect = document.querySelector('[data-field="model"]');
        const modelToggle = modelSelect.querySelector('.smart-select-toggle .selected-text');
        modelToggle.textContent = 'Select model...';
    }

    clearField(fieldName) {
        this.selectedValues[fieldName] = '';
        const selectElement = document.querySelector(`[data-field="${fieldName}"]`);
        if (selectElement) {
            const toggle = selectElement.querySelector('.smart-select-toggle .selected-text');
            const customInput = selectElement.parentElement.querySelector('.custom-input');
            
            if (fieldName === 'model') {
                toggle.textContent = this.selectedValues.make ? 'Select model...' : 'Select make first...';
            } else {
                toggle.textContent = `Select ${fieldName}...`;
            }
            
            customInput.classList.remove('show');
        }
    }

    updateVehicleSpecs() {
        const { make, model, year } = this.selectedValues;
        const specs = this.carDataProcessor.getSpecsForTrim(make, model, null, year);
        
        if (specs) {
            this.displayVehicleSpecs(specs);
        } else {
            this.clearSpecs();
        }
    }

    displayVehicleSpecs(specs) {
        const specsDisplay = document.getElementById('vehicleSpecs');
        const specsGrid = document.getElementById('specsGrid');
        
        if (!specsDisplay || !specsGrid) return;

        specsGrid.innerHTML = '';

        // Define which specs to display
        const specMap = {
            'body_type': 'Body Type',
            'transmission': 'Transmission',
            'engine_cc': 'Engine Size (CC)',
            'engine_cylinders': 'Cylinders',
            'engine_power_ps': 'Power (PS)',
            'fuel_capacity': 'Fuel Capacity (L)',
            'seats': 'Seats',
            'doors': 'Doors',
            'weight_kg': 'Weight (kg)',
            'length_mm': 'Length (mm)',
            'width_mm': 'Width (mm)',
            'height_mm': 'Height (mm)'
        };

        Object.entries(specMap).forEach(([key, label]) => {
            if (specs[key] && specs[key] !== null) {
                const specItem = document.createElement('div');
                specItem.className = 'spec-item';
                specItem.innerHTML = `
                    <span class="spec-label">${label}:</span>
                    <span class="spec-value">${specs[key]}</span>
                `;
                specsGrid.appendChild(specItem);
            }
        });

        specsDisplay.classList.add('show');

        // Auto-fill form fields from specs
        this.autoFillFromSpecs(specs);
    }

    autoFillFromSpecs(specs) {
        // Auto-fill transmission if available with normalization
        if (specs.transmission && !this.selectedValues.transmission) {
            const transmission = specs.transmission.toLowerCase();
            let normalizedTransmission = specs.transmission; // Default to original
            
            if (transmission.includes('automatic') || transmission.includes('auto')) {
                normalizedTransmission = 'Automatic';
            } else if (transmission.includes('manual')) {
                normalizedTransmission = 'Manual';
            } else if (transmission.includes('cvt')) {
                normalizedTransmission = 'CVT';
            }
            
            this.setFieldValue('transmission', normalizedTransmission);
        }

        // Auto-fill body type if available
        if (specs.body_type && !this.selectedValues.body_type) {
            this.setFieldValue('body_type', specs.body_type);
        }

        // Auto-fill fuel type based on engine specs
        if (!this.selectedValues.fuel_type) {
            let fuelType = 'Gasoline'; // Default
            
            if (specs.engine_type) {
                const engineType = specs.engine_type.toLowerCase();
                if (engineType.includes('electric')) {
                    fuelType = 'Electric';
                } else if (engineType.includes('hybrid')) {
                    fuelType = 'Hybrid';
                } else if (specs.engine_cc) {
                    fuelType = 'Gasoline';
                }
            }
            
            this.setFieldValue('fuel_type', fuelType);
        }
    }

    setFieldValue(fieldName, value) {
        this.selectedValues[fieldName] = value;
        
        const selectElement = document.querySelector(`[data-field="${fieldName}"]`);
        if (selectElement) {
            const toggle = selectElement.querySelector('.smart-select-toggle .selected-text');
            const customInput = selectElement.parentElement.querySelector('.custom-input');
            const hiddenInput = selectElement.parentElement.querySelector('input');
            
            toggle.textContent = value;
            customInput.classList.remove('show');
            
            if (hiddenInput) {
                hiddenInput.value = value;
            }
        }
    }

    clearSpecs() {
        const specsDisplay = document.getElementById('vehicleSpecs');
        if (specsDisplay) {
            specsDisplay.classList.remove('show');
        }
    }

    getFieldValue(fieldName) {
        // First check smart select values
        if (this.selectedValues[fieldName]) {
            return this.selectedValues[fieldName];
        }

        // Then check custom input values
        const customInput = document.querySelector(`[data-field="${fieldName}"]`)?.parentElement?.querySelector('.custom-input input');
        if (customInput && customInput.value) {
            return customInput.value;
        }

        // Finally check regular form inputs
        const regularInput = document.getElementById(fieldName);
        if (regularInput && regularInput.value) {
            return regularInput.value;
        }

        return '';
    }

    setupRealTimeValidation() {
        const titleField = document.getElementById('title');
        const makeField = document.getElementById('make');
        const modelField = document.getElementById('model');
        const yearField = document.getElementById('year');
        const priceField = document.getElementById('price');

        if (titleField) {
            titleField.addEventListener('input', (e) => this.validateField('title', e.target.value));
            titleField.addEventListener('blur', (e) => this.validateField('title', e.target.value));
        }

        if (makeField) {
            makeField.addEventListener('input', (e) => this.validateField('make', e.target.value));
            makeField.addEventListener('blur', (e) => this.validateField('make', e.target.value));
        }

        if (modelField) {
            modelField.addEventListener('input', (e) => this.validateField('model', e.target.value));
            modelField.addEventListener('blur', (e) => this.validateField('model', e.target.value));
        }

        if (yearField) {
            yearField.addEventListener('input', (e) => this.validateField('year', e.target.value));
            yearField.addEventListener('blur', (e) => this.validateField('year', e.target.value));
        }

        if (priceField) {
            priceField.addEventListener('input', (e) => this.validateField('price', e.target.value));
            priceField.addEventListener('blur', (e) => this.validateField('price', e.target.value));
        }
    }

    validateField(fieldName, value) {
        const field = document.getElementById(fieldName);
        if (!field) return;

        const feedback = field.parentNode.querySelector('.invalid-feedback');
        let isValid = true;
        let message = '';

        switch (fieldName) {
            case 'title':
                if (!value || value.trim().length < 5) {
                    isValid = false;
                    message = 'Title must be at least 5 characters long';
                } else if (value.trim().length > 200) {
                    isValid = false;
                    message = 'Title must be less than 200 characters';
                }
                break;

            case 'make':
                if (!value || value.trim().length < 2) {
                    isValid = false;
                    message = 'Make must be at least 2 characters long';
                } else if (value.trim().length > 50) {
                    isValid = false;
                    message = 'Make must be less than 50 characters';
                }
                break;

            case 'model':
                if (!value || value.trim().length < 1) {
                    isValid = false;
                    message = 'Model is required';
                } else if (value.trim().length > 100) {
                    isValid = false;
                    message = 'Model must be less than 100 characters';
                }
                break;

            case 'year':
                const currentYear = new Date().getFullYear();
                const yearValue = parseInt(value);
                if (!value || isNaN(yearValue) || yearValue < 1900 || yearValue > currentYear + 1) {
                    isValid = false;
                    message = `Year must be between 1900 and ${currentYear + 1}`;
                }
                break;

            case 'price':
                const priceValue = parseFloat(value);
                if (!value || isNaN(priceValue) || priceValue <= 0) {
                    isValid = false;
                    message = 'Price must be a positive number';
                }
                break;
        }

        // Update field appearance
        field.classList.remove('is-invalid', 'is-valid');
        if (value) { // Only show validation if field has content
            if (isValid) {
                field.classList.add('is-valid');
            } else {
                field.classList.add('is-invalid');
            }
        }

        // Update feedback message
        if (feedback) {
            feedback.textContent = message;
        }

        return isValid;
    }

    populateUserInfo() {
        if (this.currentUser) {
            const phoneInput = document.getElementById('contact_phone');
            const emailInput = document.getElementById('contact_email');
            
            if (phoneInput && !phoneInput.value) {
                phoneInput.value = this.currentUser.phone || '';
            }
            if (emailInput && !emailInput.value) {
                emailInput.value = this.currentUser.email || '';
            }
        }
    }

    populateContactInfo() {
        if (this.currentUser) {
            const phoneInput = document.getElementById('contact_phone');
            const emailInput = document.getElementById('contact_email');
            
            if (phoneInput) phoneInput.value = this.currentUser.phone || '';
            if (emailInput) emailInput.value = this.currentUser.email || '';
        }
    }

    async handleCreateAd(event) {
        event.preventDefault();
        
        // Clear previous validation
        this.clearValidation();
        
        try {
            // Collect form data from both traditional inputs and smart selects
            const formData = new FormData(event.target);
            const adData = {
                title: formData.get('title'),
                make: this.getFieldValue('make') || formData.get('make'),
                model: this.getFieldValue('model') || formData.get('model'),
                year: parseInt(this.getFieldValue('year') || formData.get('year')),
                price: parseFloat(formData.get('price')),
                mileage: formData.get('mileage') ? parseInt(formData.get('mileage')) : null,
                condition: formData.get('condition'),
                fuel_type: this.getFieldValue('fuel_type') || formData.get('fuel_type'),
                transmission: this.getFieldValue('transmission') || formData.get('transmission'),
                body_type: this.getFieldValue('body_type') || formData.get('body_type'),
                exterior_color: this.getFieldValue('exterior_color') || formData.get('exterior_color'),
                interior_color: this.getFieldValue('interior_color') || formData.get('interior_color'),
                vin: formData.get('vin'),
                description: formData.get('description'),
                contact_phone: formData.get('contact_phone'),
                contact_email: formData.get('contact_email'),
                location_city: formData.get('location_city'),
                location_state: formData.get('location_state'),
                location_zip: formData.get('location_zip'),
                is_published: formData.get('is_published') === 'on',
                features: [], // TODO: Add features input
                images: [] // TODO: Add image upload
            };

            // Client-side validation
            const validationErrors = this.validateAdData(adData);
            if (validationErrors.length > 0) {
                this.showValidationErrors(validationErrors);
                return;
            }

            console.log('Sending ad data:', adData); // Debug log

            const response = await fetch('/api/personal-ads', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(adData)
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert('Ad created successfully!', 'success');
                event.target.reset();
                this.populateContactInfo(); // Restore contact info
                
                // Switch to My Ads tab and reload
                this.switchToMyAdsTab();
                this.loadMyAds();
            } else {
                console.error('Validation errors:', result.errors);
                console.error('Full result:', result);
                
                // Log each error in detail
                if (result.errors && result.errors.length > 0) {
                    result.errors.forEach((error, index) => {
                        console.error(`Error ${index + 1}:`, {
                            field: error.path || error.param || 'unknown',
                            message: error.msg || error.message || 'No message',
                            value: error.value || 'No value',
                            location: error.location || 'unknown',
                            fullError: error
                        });
                        
                        // Also log the raw error object
                        console.error(`Raw Error ${index + 1}:`, error);
                    });
                    this.showServerValidationErrors(result.errors);
                } else {
                    this.showAlert(result.message || 'Failed to create ad', 'error');
                }
            }
        } catch (error) {
            console.error('Error creating ad:', error);
            this.showAlert('Error creating ad', 'error');
        }
    }

    validateAdData(data) {
        const errors = [];

        // Title validation
        if (!data.title || data.title.trim().length < 5) {
            errors.push({
                field: 'title',
                message: 'Title must be at least 5 characters long'
            });
        } else if (data.title.trim().length > 200) {
            errors.push({
                field: 'title',
                message: 'Title must be less than 200 characters'
            });
        }

        // Make validation
        if (!data.make || data.make.trim().length < 2) {
            errors.push({
                field: 'make',
                message: 'Make must be at least 2 characters long'
            });
        } else if (data.make.trim().length > 50) {
            errors.push({
                field: 'make',
                message: 'Make must be less than 50 characters'
            });
        }

        // Model validation
        if (!data.model || data.model.trim().length < 1) {
            errors.push({
                field: 'model',
                message: 'Model is required'
            });
        } else if (data.model.trim().length > 100) {
            errors.push({
                field: 'model',
                message: 'Model must be less than 100 characters'
            });
        }

        // Year validation
        const currentYear = new Date().getFullYear();
        if (!data.year || data.year < 1900 || data.year > currentYear + 1) {
            errors.push({
                field: 'year',
                message: `Year must be between 1900 and ${currentYear + 1}`
            });
        }

        // Price validation
        if (!data.price || data.price <= 0) {
            errors.push({
                field: 'price',
                message: 'Price must be a positive number'
            });
        }

        return errors;
    }

    clearValidation() {
        // Clear validation summary
        const summary = document.getElementById('validationSummary');
        if (summary) {
            summary.style.display = 'none';
        }

        // Clear individual field validation
        const formControls = document.querySelectorAll('.form-control');
        formControls.forEach(control => {
            control.classList.remove('is-invalid', 'is-valid');
            const feedback = control.parentNode.querySelector('.invalid-feedback');
            if (feedback) {
                feedback.textContent = '';
            }
        });
    }

    showValidationErrors(errors) {
        // Show validation summary
        const summary = document.getElementById('validationSummary');
        const errorsList = document.getElementById('validationErrors');
        
        if (summary && errorsList) {
            errorsList.innerHTML = '';
            errors.forEach(error => {
                const li = document.createElement('li');
                li.textContent = error.message;
                errorsList.appendChild(li);
            });
            summary.style.display = 'block';
        }

        // Mark individual fields as invalid
        errors.forEach(error => {
            const field = document.getElementById(error.field);
            if (field) {
                field.classList.add('is-invalid');
                const feedback = field.parentNode.querySelector('.invalid-feedback');
                if (feedback) {
                    feedback.textContent = error.message;
                }
            }
        });

        // Scroll to validation summary
        if (summary) {
            summary.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    showServerValidationErrors(serverErrors) {
        const clientErrors = serverErrors.map(err => ({
            field: err.path || err.param,
            message: err.msg || err.message
        }));
        this.showValidationErrors(clientErrors);
    }

    switchToMyAdsTab() {
        // Remove active class from all tabs
        const tabs = document.querySelectorAll('.nav-tab');
        tabs.forEach(tab => tab.classList.remove('active'));

        // Remove active class from all tab contents
        const contents = document.querySelectorAll('.tab-content');
        contents.forEach(content => content.classList.remove('active'));

        // Add active class to My Ads tab
        const myAdsTab = document.querySelector('.nav-tab[onclick*="my-ads"]');
        if (myAdsTab) {
            myAdsTab.classList.add('active');
        }

        // Add active class to My Ads content
        const myAdsContent = document.getElementById('my-ads');
        if (myAdsContent) {
            myAdsContent.classList.add('active');
        }
    }

    async loadMyAds() {
        try {
            const response = await fetch('/api/personal-ads/my');
            const result = await response.json();

            if (result.success) {
                this.myAds = result.data;
                this.renderMyAds();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Error loading ads:', error);
            document.getElementById('myAdsContent').innerHTML = 
                '<div class="alert alert-error">Failed to load your ads</div>';
        }
    }

    async loadFavoriteAds() {
        try {
            const response = await fetch('/api/personal-ads/favorites');
            const result = await response.json();

            if (result.success) {
                this.favoriteAds = result.data;
                this.renderFavoriteAds();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Error loading favorite ads:', error);
            document.getElementById('favoritesContent').innerHTML = 
                '<div class="alert alert-error">Failed to load favorite ads</div>';
        }
    }

    renderMyAds() {
        const container = document.getElementById('myAdsContent');
        
        if (this.myAds.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No ads yet</h3>
                    <p>Create your first car ad to get started selling on AutoMax</p>
                    <button class="btn btn-primary" data-action="switchTab" data-tab="create">Create First Ad</button>
                </div>
            `;
            return;
        }

        const adsHtml = this.myAds.map(ad => this.renderAdCard(ad, true)).join('');
        container.innerHTML = `<div class="ad-grid">${adsHtml}</div>`;
    }

    renderFavoriteAds() {
        const container = document.getElementById('favoritesContent');
        
        if (this.favoriteAds.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No favorite ads</h3>
                    <p>Browse the marketplace and save ads you're interested in</p>
                    <a href="/" class="btn btn-primary">Browse Cars</a>
                </div>
            `;
            return;
        }

        const adsHtml = this.favoriteAds.map(ad => this.renderAdCard(ad, false)).join('');
        container.innerHTML = `<div class="ad-grid">${adsHtml}</div>`;
    }

    renderAdCard(ad, isOwn = false) {
        const statusClass = `status-${ad.status}`;
        const publishStatus = ad.is_published ? 'Published' : 'Draft';
        const publishStatusClass = ad.is_published ? 'status-active' : 'status-paused';

        const actionsHtml = isOwn ? `
            <div class="ad-actions">
                ${!ad.is_published ? 
                    `<button class="btn btn-success btn-sm" data-action="publishAd" data-ad-id="${ad.id}">Publish</button>` :
                    `<button class="btn btn-secondary btn-sm" data-action="unpublishAd" data-ad-id="${ad.id}">Unpublish</button>`
                }
                ${ad.status === 'active' ? 
                    `<button class="btn btn-secondary btn-sm" data-action="markAsSold" data-ad-id="${ad.id}">Mark as Sold</button>` : ''
                }
                <button class="btn btn-primary btn-sm" data-action="editAd" data-ad-id="${ad.id}">Edit</button>
                <button class="btn btn-danger btn-sm" data-action="deleteAd" data-ad-id="${ad.id}">Delete</button>
            </div>
        ` : `
            <div class="ad-actions">
                <button class="btn btn-danger btn-sm" data-action="removeFavorite" data-ad-id="${ad.id}">Remove from Favorites</button>
                <button class="btn btn-primary btn-sm" data-action="viewAd" data-ad-id="${ad.id}">View Details</button>
            </div>
        `;

        return `
            <div class="ad-card">
                <div class="ad-header">
                    <div>
                        <div class="ad-title">${this.escapeHtml(ad.title)}</div>
                        <div class="ad-price">$${ad.price.toLocaleString()}</div>
                    </div>
                    <div>
                        <span class="ad-status ${statusClass}">${ad.status}</span>
                        ${isOwn ? `<span class="ad-status ${publishStatusClass}" style="margin-left: 5px;">${publishStatus}</span>` : ''}
                    </div>
                </div>
                
                <div class="ad-details">
                    <div class="ad-detail">
                        <span>Vehicle:</span>
                        <span>${ad.year} ${this.escapeHtml(ad.make)} ${this.escapeHtml(ad.model)}</span>
                    </div>
                    ${ad.mileage ? `
                        <div class="ad-detail">
                            <span>Mileage:</span>
                            <span>${ad.mileage.toLocaleString()} miles</span>
                        </div>
                    ` : ''}
                    <div class="ad-detail">
                        <span>Condition:</span>
                        <span>${this.capitalizeFirst(ad.condition)}</span>
                    </div>
                    ${ad.location_city ? `
                        <div class="ad-detail">
                            <span>Location:</span>
                            <span>${this.escapeHtml(ad.location_city)}, ${this.escapeHtml(ad.location_state)}</span>
                        </div>
                    ` : ''}
                    ${isOwn ? `
                        <div class="ad-detail">
                            <span>Views:</span>
                            <span>${ad.views_count}</span>
                        </div>
                        <div class="ad-detail">
                            <span>Created:</span>
                            <span>${new Date(ad.created_at).toLocaleDateString()}</span>
                        </div>
                        ${ad.hours_until_expiry !== undefined ? `
                            <div class="ad-detail">
                                <span>Expires:</span>
                                <span>${ad.hours_until_expiry > 0 ? 
                                    `${Math.round(ad.hours_until_expiry)} hours` : 
                                    'Expired'}</span>
                            </div>
                        ` : ''}
                    ` : ''}
                </div>

                ${actionsHtml}
            </div>
        `;
    }

    async publishAd(adId) {
        try {
            const response = await fetch(`/api/personal-ads/${adId}/publish`, {
                method: 'POST'
            });
            const result = await response.json();

            if (result.success) {
                this.showAlert('Ad published successfully!', 'success');
                this.loadMyAds();
            } else {
                this.showAlert(result.message || 'Failed to publish ad', 'error');
            }
        } catch (error) {
            console.error('Error publishing ad:', error);
            this.showAlert('Error publishing ad', 'error');
        }
    }

    async unpublishAd(adId) {
        try {
            const response = await fetch(`/api/personal-ads/${adId}/unpublish`, {
                method: 'POST'
            });
            const result = await response.json();

            if (result.success) {
                this.showAlert('Ad unpublished successfully!', 'success');
                this.loadMyAds();
            } else {
                this.showAlert(result.message || 'Failed to unpublish ad', 'error');
            }
        } catch (error) {
            console.error('Error unpublishing ad:', error);
            this.showAlert('Error unpublishing ad', 'error');
        }
    }

    async markAsSold(adId) {
        if (!confirm('Mark this ad as sold? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/personal-ads/${adId}/mark-sold`, {
                method: 'POST'
            });
            const result = await response.json();

            if (result.success) {
                this.showAlert('Ad marked as sold!', 'success');
                this.loadMyAds();
            } else {
                this.showAlert(result.message || 'Failed to mark ad as sold', 'error');
            }
        } catch (error) {
            console.error('Error marking ad as sold:', error);
            this.showAlert('Error marking ad as sold', 'error');
        }
    }

    async deleteAd(adId) {
        if (!confirm('Delete this ad permanently? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/personal-ads/${adId}`, {
                method: 'DELETE'
            });
            const result = await response.json();

            if (result.success) {
                this.showAlert('Ad deleted successfully!', 'success');
                this.loadMyAds();
            } else {
                this.showAlert(result.message || 'Failed to delete ad', 'error');
            }
        } catch (error) {
            console.error('Error deleting ad:', error);
            this.showAlert('Error deleting ad', 'error');
        }
    }

    async removeFavorite(adId) {
        try {
            const response = await fetch(`/api/personal-ads/${adId}/favorite`, {
                method: 'DELETE'
            });
            const result = await response.json();

            if (result.success) {
                this.showAlert('Removed from favorites', 'success');
                this.loadFavoriteAds();
            } else {
                this.showAlert(result.message || 'Failed to remove from favorites', 'error');
            }
        } catch (error) {
            console.error('Error removing from favorites:', error);
            this.showAlert('Error removing from favorites', 'error');
        }
    }

    editAd(adId) {
        // TODO: Implement edit functionality
        alert('Edit functionality coming soon!');
    }

    viewAd(adId) {
        // TODO: Implement view details page
        alert('View details functionality coming soon!');
    }

    showAlert(message, type = 'success') {
        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());

        // Create new alert
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;

        // Insert at the top of the container
        const container = document.querySelector('.container');
        const header = container.querySelector('.header');
        container.insertBefore(alert, header.nextSibling);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    fillExampleData() {
        const examples = [
            {
                title: '2020 Honda Civic LX - Excellent Condition',
                make: 'Honda',
                model: 'Civic',
                year: '2020',
                price: '22000',
                mileage: '35000',
                condition: 'used',
                fuel_type: 'gasoline',
                transmission: 'automatic',
                body_type: 'sedan',
                exterior_color: 'White',
                interior_color: 'Black',
                vin: '1HGBH41JXMN109186',
                description: 'Well-maintained Honda Civic with low mileage. Single owner, garage kept, regular maintenance records available. Features include backup camera, Bluetooth connectivity, and excellent fuel economy.'
            },
            {
                title: '2019 Toyota Camry SE - Low Miles',
                make: 'Toyota',
                model: 'Camry',
                year: '2019',
                price: '24500',
                mileage: '28000',
                condition: 'used',
                fuel_type: 'gasoline',
                transmission: 'automatic',
                body_type: 'sedan',
                exterior_color: 'Silver',
                interior_color: 'Gray',
                vin: '4T1B11HK5KU123456',
                description: 'Sporty Toyota Camry SE with premium features. Excellent reliability record, recent tire replacement, and comprehensive warranty remaining.'
            },
            {
                title: '2021 Ford F-150 XLT - 4WD Truck',
                make: 'Ford',
                model: 'F-150',
                year: '2021',
                price: '42000',
                mileage: '15000',
                condition: 'used',
                fuel_type: 'gasoline',
                transmission: 'automatic',
                body_type: 'truck',
                exterior_color: 'Blue',
                interior_color: 'Black',
                vin: '1FTFW1ET5MFA12345',
                description: 'Powerful F-150 XLT with 4WD capability. Perfect for work or recreation. Includes towing package, bed liner, and extended cab.'
            }
        ];

        // Pick a random example
        const example = examples[Math.floor(Math.random() * examples.length)];

        // Fill the form fields
        Object.keys(example).forEach(key => {
            // Handle smart select fields
            if (['make', 'model', 'year', 'fuel_type', 'transmission', 'body_type', 'exterior_color', 'interior_color'].includes(key)) {
                this.setFieldValue(key, example[key]);
            } else {
                // Handle regular form fields
                const field = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
                if (field) {
                    field.value = example[key];
                    // Trigger validation for the field
                    this.validateField(key, example[key]);
                }
            }
        });

        // Set publication status
        const publishCheckbox = document.getElementById('is_published');
        if (publishCheckbox) {
            publishCheckbox.checked = true;
        }

        // Update vehicle specs if possible
        if (example.make && example.model && example.year) {
            this.updateVehicleSpecs();
        }

        this.showAlert('Example data filled! You can modify any fields as needed.', 'success');
    }
}

// Tab switching functionality - delegates to the class method
function switchTab(tabName) {
    if (window.personalAdsManager) {
        window.personalAdsManager.switchTab(null, tabName);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.personalAdsManager = new PersonalAdsManager();
});
