// Car Data Processor for AutoMax Ad Creation
// This script processes the full car_data_with_specs.json to extract useful information

class CarDataProcessor {
    constructor() {
        this.carData = null;
        this.processedData = {
            makes: {},
            bodyTypes: new Set(),
            colors: new Set(),
            transmissions: new Set(),
            fuelTypes: new Set(),
            driveTypes: new Set(),
            years: new Set()
        };
    }

    async loadCarData() {
        try {
            // First try to load from the car-options.json file
            const response = await fetch('/data/car-options.json');
            if (response.ok) {
                const carOptions = await response.json();
                console.log('Loaded car data from car-options.json');
                return this.convertCarOptionsFormat(carOptions);
            }
            
            // Fallback to API if file doesn't exist
            const apiResponse = await fetch('/api/car-data');
            if (!apiResponse.ok) {
                throw new Error(`HTTP error! status: ${apiResponse.status}`);
            }
            this.carData = await apiResponse.json();
            this.processData();
            return this.getProcessedData();
        } catch (error) {
            console.error('Failed to load car data:', error);
            throw error;
        }
    }

    convertCarOptionsFormat(carOptions) {
        // Convert the car-options.json format to the expected format
        const processedData = {
            makes: {},
            bodyTypes: carOptions.bodyTypes || [],
            transmissions: carOptions.transmissions || [],
            fuelTypes: carOptions.fuelTypes || [],
            colors: carOptions.colors || [],
            conditions: carOptions.conditions || [],
            canadianCities: carOptions.canadianCities || [],
            years: Array.from({length: 30}, (_, i) => new Date().getFullYear() - i)
        };

        // Convert makes and models
        if (carOptions.makes) {
            Object.entries(carOptions.makes).forEach(([makeName, makeData]) => {
                processedData.makes[makeName] = {
                    name: makeData.name,
                    models: makeData.models || []
                };
            });
        }

        return processedData;
    }

    processData() {
        if (!this.carData) return;

        Object.entries(this.carData).forEach(([makeName, makeData]) => {
            if (!makeData.models) return;

            const models = {};
            Object.entries(makeData.models).forEach(([modelName, modelData]) => {
                const modelInfo = {
                    name: modelData.model_name || modelName,
                    trims: []
                };

                if (modelData.trims && Array.isArray(modelData.trims)) {
                    modelData.trims.forEach(trim => {
                        if (trim.data) {
                            const trimData = {
                                name: trim.trim_name,
                                year: trim.year,
                                specs: trim.data
                            };
                            modelInfo.trims.push(trimData);

                            // Extract unique values for dropdowns
                            this.extractUniqueValues(trim.data, trim.year);
                        }
                    });
                }

                models[modelName] = modelInfo;
            });

            this.processedData.makes[makeName] = {
                name: makeData.make_name || makeName,
                country: makeData.make_country,
                models: models
            };
        });
    }

    extractUniqueValues(data, year) {
        if (data.body_type) this.processedData.bodyTypes.add(data.body_type);
        
        // Process transmission with normalization
        if (data.transmission) {
            const transmission = data.transmission.toLowerCase();
            if (transmission.includes('automatic') || transmission.includes('auto')) {
                this.processedData.transmissions.add('Automatic');
            } else if (transmission.includes('manual')) {
                this.processedData.transmissions.add('Manual');
            } else if (transmission.includes('cvt')) {
                this.processedData.transmissions.add('CVT');
            } else {
                // Keep original if it doesn't match common patterns
                this.processedData.transmissions.add(data.transmission);
            }
        }
        
        if (data.drive_type) this.processedData.driveTypes.add(data.drive_type);
        if (year) this.processedData.years.add(parseInt(year));

        // Process fuel type with normalization
        if (data.engine_type) {
            const engineType = data.engine_type.toLowerCase();
            if (engineType.includes('electric')) {
                this.processedData.fuelTypes.add('Electric');
            } else if (engineType.includes('hybrid')) {
                this.processedData.fuelTypes.add('Hybrid');
            } else if (data.engine_cc) {
                // If it has engine displacement, it's likely gasoline
                this.processedData.fuelTypes.add('Gasoline');
            }
        }
        
        // Also check for explicit fuel type mentions
        if (data.fuel_type) {
            const fuelType = data.fuel_type.toLowerCase();
            if (fuelType.includes('diesel')) {
                this.processedData.fuelTypes.add('Diesel');
            } else if (fuelType.includes('electric')) {
                this.processedData.fuelTypes.add('Electric');
            } else if (fuelType.includes('hybrid')) {
                this.processedData.fuelTypes.add('Hybrid');
            } else if (fuelType.includes('gas') || fuelType.includes('petrol')) {
                this.processedData.fuelTypes.add('Gasoline');
            }
        }
    }

    getProcessedData() {
        return {
            makes: this.processedData.makes,
            bodyTypes: Array.from(this.processedData.bodyTypes).sort(),
            transmissions: Array.from(this.processedData.transmissions).sort(),
            driveTypes: Array.from(this.processedData.driveTypes).sort(),
            fuelTypes: Array.from(this.processedData.fuelTypes).sort(),
            years: Array.from(this.processedData.years).sort((a, b) => b - a), // Latest first
            colors: [
                'White', 'Black', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 
                'Brown', 'Gold', 'Yellow', 'Orange', 'Purple', 'Beige', 'Tan'
            ],
            conditions: [
                { value: 'new', label: 'New' },
                { value: 'used', label: 'Used' },
                { value: 'certified', label: 'Certified Pre-Owned' }
            ]
        };
    }

    getModelsForMake(makeName) {
        return this.processedData.makes[makeName]?.models || {};
    }

    getTrimsForModel(makeName, modelName) {
        return this.processedData.makes[makeName]?.models[modelName]?.trims || [];
    }

    getSpecsForTrim(makeName, modelName, trimName, year) {
        const trims = this.getTrimsForModel(makeName, modelName);
        const trim = trims.find(t => t.name === trimName && t.year === year);
        return trim?.specs || null;
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CarDataProcessor;
}
