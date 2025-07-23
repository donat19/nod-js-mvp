const express = require('express');
const router = express.Router();
const axios = require('axios');

// VIN lookup endpoint
router.post('/lookup', async (req, res) => {
    try {
        const { vin } = req.body;
        
        // Validate VIN format
        if (!vin || vin.length !== 17) {
            return res.status(400).json({
                success: false,
                message: 'VIN must be exactly 17 characters long'
            });
        }

        // Clean VIN (remove spaces, convert to uppercase)
        const cleanVin = vin.trim().toUpperCase();
        
        // Validate VIN characters (should only contain alphanumeric, excluding I, O, Q)
        const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
        if (!vinRegex.test(cleanVin)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid VIN format. VIN should contain only letters and numbers (excluding I, O, Q)'
            });
        }

        // Call NHTSA VPIC API
        const url = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${cleanVin}?format=json`;
        const response = await axios.get(url, { timeout: 10000 });
        
        if (!response.data || !response.data.Results) {
            return res.status(500).json({
                success: false,
                message: 'Unable to decode VIN. Please try again later.'
            });
        }

        // Process the results
        const results = response.data.Results;
        const vehicleInfo = {};

        // Map VPIC fields to our form fields
        const fieldMappings = {
            'Make': 'make',
            'Model': 'model',
            'Model Year': 'year',
            'Body Class': 'body_type',
            'Vehicle Type': 'vehicle_type',
            'Fuel Type - Primary': 'fuel_type',
            'Engine Number of Cylinders': 'engine_cylinders',
            'Engine Configuration': 'engine_configuration',
            'Engine Model': 'engine_model',
            'Displacement (CC)': 'engine_displacement_cc',
            'Displacement (CI)': 'engine_displacement_ci',
            'Displacement (L)': 'engine_displacement_l',
            'Transmission Style': 'transmission',
            'Drive Type': 'drive_type',
            'Doors': 'doors',
            'Windows': 'windows',
            'Wheel Base Type': 'wheelbase_type',
            'Track Width (inches)': 'track_width',
            'Gross Vehicle Weight Rating From': 'gvwr_from',
            'Gross Vehicle Weight Rating To': 'gvwr_to',
            'Manufacturer Name': 'manufacturer',
            'Plant City': 'plant_city',
            'Plant State': 'plant_state',
            'Plant Country': 'plant_country',
            'Series': 'series',
            'Trim': 'trim',
            'Vehicle Descriptor': 'vehicle_descriptor',
            'Error Code': 'error_code',
            'Error Text': 'error_text'
        };

        // Extract relevant information
        results.forEach(item => {
            const variable = item.Variable;
            const value = item.Value;
            
            if (value && value !== "Not Applicable" && value !== "" && fieldMappings[variable]) {
                vehicleInfo[fieldMappings[variable]] = value;
            }
        });

        // Check if VIN decode was successful
        if (vehicleInfo.error_code && vehicleInfo.error_code !== "0") {
            return res.status(400).json({
                success: false,
                message: vehicleInfo.error_text || 'Unable to decode VIN',
                vinData: vehicleInfo
            });
        }

        // Ensure we have basic vehicle info
        if (!vehicleInfo.make || !vehicleInfo.model || !vehicleInfo.year) {
            return res.status(400).json({
                success: false,
                message: 'VIN decode incomplete. Unable to determine basic vehicle information.',
                vinData: vehicleInfo
            });
        }

        res.json({
            success: true,
            message: 'VIN decoded successfully',
            vin: cleanVin,
            vehicleInfo: vehicleInfo
        });

    } catch (error) {
        console.error('VIN lookup error:', error);
        
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            return res.status(408).json({
                success: false,
                message: 'VIN lookup timed out. Please try again.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'VIN lookup service temporarily unavailable. Please try again later.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
