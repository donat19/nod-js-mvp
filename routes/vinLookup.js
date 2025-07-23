const express = require('express');
const router = express.Router();
const axios = require('axios');
const logger = require('../config/logger');

// VIN lookup endpoint
router.post('/lookup', async (req, res) => {
    const startTime = Date.now();
    const clientIP = req.ip || req.connection.remoteAddress;
    
    try {
        const { vin } = req.body;
        
        logger.info('VIN lookup request started', {
            vin: vin ? `${vin.substring(0, 8)}...` : 'undefined', // Log partial VIN for privacy
            clientIP,
            userAgent: req.headers['user-agent'],
            timestamp: new Date().toISOString()
        });
        
        // Validate VIN format
        if (!vin || vin.length !== 17) {
            logger.warn('VIN validation failed - incorrect length', {
                vin: vin ? `${vin.substring(0, 8)}...` : 'undefined',
                vinLength: vin ? vin.length : 0,
                clientIP
            });
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
            logger.warn('VIN validation failed - invalid format', {
                vin: `${cleanVin.substring(0, 8)}...`,
                clientIP
            });
            return res.status(400).json({
                success: false,
                message: 'Invalid VIN format. VIN should contain only letters and numbers (excluding I, O, Q)'
            });
        }

        logger.debug('VIN validation passed, calling NHTSA API', {
            vin: `${cleanVin.substring(0, 8)}...`,
            clientIP
        });

        // Call NHTSA VPIC API
        const url = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${cleanVin}?format=json`;
        const apiStartTime = Date.now();
        const response = await axios.get(url, { timeout: 10000 });
        const apiDuration = Date.now() - apiStartTime;
        
        logger.info('NHTSA API response received', {
            vin: `${cleanVin.substring(0, 8)}...`,
            apiDuration,
            statusCode: response.status,
            clientIP
        });
        
        if (!response.data || !response.data.Results) {
            logger.error('NHTSA API returned invalid response structure', {
                vin: `${cleanVin.substring(0, 8)}...`,
                responseData: response.data ? 'exists but no Results' : 'null/undefined',
                statusCode: response.status,
                clientIP
            });
            return res.status(500).json({
                success: false,
                message: 'Unable to decode VIN. Please try again later.'
            });
        }

        // Process the results
        const results = response.data.Results;
        const vehicleInfo = {};

        // Map VPIC fields to our form fields - comprehensive mapping
        const fieldMappings = {
            // Basic Vehicle Info
            'Make': 'make',
            'Model': 'model',
            'Model Year': 'year',
            'Body Class': 'body_type',
            'Vehicle Type': 'vehicle_type',
            'Fuel Type - Primary': 'fuel_type',
            'Fuel Type - Secondary': 'fuel_type_secondary',
            'Series': 'series',
            'Trim': 'trim',
            'Vehicle Descriptor': 'vehicle_descriptor',
            
            // Manufacturer Information
            'Manufacturer Name': 'manufacturer',
            'Plant City': 'plant_city',
            'Plant State': 'plant_state',
            'Plant Country': 'plant_country',
            'Plant Company Name': 'plant_company',
            
            // Engine Specifications
            'Engine Number of Cylinders': 'engine_cylinders',
            'Engine Configuration': 'engine_configuration',
            'Engine Model': 'engine_model',
            'Displacement (CC)': 'engine_displacement_cc',
            'Displacement (CI)': 'engine_displacement_ci',
            'Displacement (L)': 'engine_displacement_l',
            'Engine Power (kW)': 'engine_power_kw',
            'Engine Brake (HP)': 'engine_power_hp',
            'Engine Stroke Cycles': 'engine_stroke_cycles',
            'Engine Manufacturer': 'engine_manufacturer',
            'Turbo': 'turbo',
            'Supercharger': 'supercharger',
            'Valve Train Design': 'valve_train',
            'Injection Type': 'injection_type',
            'Compression Ratio': 'compression_ratio',
            'Cooling Type': 'cooling_type',
            'Engine Head': 'engine_head',
            'Engine Block': 'engine_block',
            
            // Transmission & Drivetrain
            'Transmission Style': 'transmission',
            'Transmission Speeds': 'transmission_speeds',
            'Drive Type': 'drive_type',
            'Axles': 'axles',
            'Axle Ratio': 'axle_ratio',
            
            // Dimensions & Weight
            'Doors': 'doors',
            'Windows': 'windows',
            'Wheel Base (inches)': 'wheelbase_inches',
            'Wheel Base Type': 'wheelbase_type',
            'Track Width (inches)': 'track_width',
            'Gross Vehicle Weight Rating From': 'gvwr_from',
            'Gross Vehicle Weight Rating To': 'gvwr_to',
            'Curb Weight (pounds)': 'curb_weight',
            'Gross Combined Weight Rating From': 'gcwr_from',
            'Gross Combined Weight Rating To': 'gcwr_to',
            'GVWR Class': 'gvwr_class',
            
            // Safety Features
            'Driver Air Bag Locations': 'airbag_driver',
            'Passenger Air Bag Locations': 'airbag_passenger',
            'Air Bag Locatons': 'airbag_locations',
            'Curtain Air Bag Locations': 'airbag_curtain',
            'Knee Air Bag Locations': 'airbag_knee',
            'Side Air Bag Locations': 'airbag_side',
            'Seat Belt Type': 'seatbelt_type',
            'Pretensioner': 'seatbelt_pretensioner',
            'TPMS': 'tpms',
            'Electronic Stability Control (ESC)': 'esc',
            'Traction Control': 'traction_control',
            'Anti-lock Braking System (ABS)': 'abs',
            'Crash Test Rating': 'crash_rating',
            
            // Additional Features
            'Trim2': 'trim_level',
            'Entertainment System': 'entertainment_system',
            'Steering Location': 'steering_location',
            'Brake System Type': 'brake_system',
            'Brake System Description': 'brake_description',
            'Front Brake Type': 'brake_front',
            'Rear Brake Type': 'brake_rear',
            'Suspension Type - Front': 'suspension_front',
            'Suspension Type - Rear': 'suspension_rear',
            'Spring Type - Front': 'spring_front',
            'Spring Type - Rear': 'spring_rear',
            'Steering Type': 'steering_type',
            
            // Wheels & Tires
            'Wheel Size Front (inches)': 'wheel_size_front',
            'Wheel Size Rear (inches)': 'wheel_size_rear',
            'Tire Size Front': 'tire_size_front',
            'Tire Size Rear': 'tire_size_rear',
            
            // Electrical
            'Battery Type': 'battery_type',
            'Battery Info': 'battery_info',
            'Battery Cells': 'battery_cells',
            'Battery Current (Amps)': 'battery_current',
            'Battery Voltage (Volts)': 'battery_voltage',
            'Battery Energy (kWh)': 'battery_energy',
            'Charging Level': 'charging_level',
            'Motor Type': 'motor_type',
            'Motor Location': 'motor_location',
            'Electric Vehicle Type': 'ev_type',
            
            // Other
            'Bus Floor Configuration': 'bus_floor_config',
            'Bus Type': 'bus_type',
            'Motorcycle Suspension Type': 'motorcycle_suspension',
            'Motorcycle Chassis Type': 'motorcycle_chassis',
            'Trailer Type Connection': 'trailer_connection',
            'Trailer Body Type': 'trailer_body_type',
            'Semi-automatic Transmission': 'semi_auto_transmission',
            'Adaptive Driving Beam (ADB)': 'adaptive_driving_beam',
            'Adaptive Cruise Control (ACC)': 'adaptive_cruise_control',
            'Blind Spot Warning (BSW)': 'blind_spot_warning',
            'Forward Collision Warning (FCW)': 'forward_collision_warning',
            'Lane Departure Warning (LDW)': 'lane_departure_warning',
            'Lane Keeping Support (LKS)': 'lane_keeping_support',
            'Backup Camera': 'backup_camera',
            'Parking Assist': 'parking_assist',
            'Keyless Ignition': 'keyless_ignition',
            'Daytime Running Light (DRL)': 'daytime_running_lights',
            'Headlamp Light Source': 'headlamp_light_source',
            'Semiautomatic Headlamp Beam Switching': 'auto_headlamp_switching',
            'Auto-Dimming Rearview Mirror': 'auto_dimming_mirror',
            'Lower Beam Headlamp Light Source': 'headlamp_lower_beam',
            'Upper Beam Headlamp Light Source': 'headlamp_upper_beam',
            
            // Error handling
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

        logger.debug('VIN data extraction completed', {
            vin: `${cleanVin.substring(0, 8)}...`,
            fieldsExtracted: Object.keys(vehicleInfo).length,
            clientIP
        });

        // Check if VIN decode was successful
        if (vehicleInfo.error_code && vehicleInfo.error_code !== "0") {
            logger.warn('VIN decode returned error code', {
                vin: `${cleanVin.substring(0, 8)}...`,
                errorCode: vehicleInfo.error_code,
                errorText: vehicleInfo.error_text,
                clientIP
            });
            return res.status(400).json({
                success: false,
                message: vehicleInfo.error_text || 'Unable to decode VIN',
                vinData: vehicleInfo
            });
        }

        // Ensure we have basic vehicle info
        if (!vehicleInfo.make || !vehicleInfo.model || !vehicleInfo.year) {
            logger.warn('VIN decode incomplete - missing basic vehicle information', {
                vin: `${cleanVin.substring(0, 8)}...`,
                hasMake: !!vehicleInfo.make,
                hasModel: !!vehicleInfo.model,
                hasYear: !!vehicleInfo.year,
                totalFields: Object.keys(vehicleInfo).length,
                clientIP
            });
            return res.status(400).json({
                success: false,
                message: 'VIN decode incomplete. Unable to determine basic vehicle information.',
                vinData: vehicleInfo
            });
        }

        const totalDuration = Date.now() - startTime;
        logger.info('VIN lookup completed successfully', {
            vin: `${cleanVin.substring(0, 8)}...`,
            vehicle: `${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}`,
            fieldsReturned: Object.keys(vehicleInfo).length,
            totalDuration,
            clientIP
        });

        res.json({
            success: true,
            message: 'VIN decoded successfully',
            vin: cleanVin,
            vehicleInfo: vehicleInfo
        });

    } catch (error) {
        const totalDuration = Date.now() - startTime;
        
        logger.error('VIN lookup error occurred', {
            vin: req.body.vin ? `${req.body.vin.substring(0, 8)}...` : 'undefined',
            error: {
                message: error.message,
                code: error.code,
                name: error.name,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            totalDuration,
            clientIP,
            userAgent: req.headers['user-agent']
        });
        
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            logger.warn('VIN lookup timeout', {
                vin: req.body.vin ? `${req.body.vin.substring(0, 8)}...` : 'undefined',
                clientIP,
                totalDuration
            });
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
