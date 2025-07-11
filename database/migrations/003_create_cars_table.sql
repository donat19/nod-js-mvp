-- Migration: Create cars table for vehicle listings
-- Date: 2025-07-10
-- Description: Add cars table for AutoMax car sales platform

-- Create cars table
CREATE TABLE IF NOT EXISTS cars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    make VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    mileage INTEGER,
    condition VARCHAR(20) DEFAULT 'used', -- 'new', 'used', 'certified'
    fuel_type VARCHAR(20) DEFAULT 'gasoline', -- 'gasoline', 'hybrid', 'electric', 'diesel'
    transmission VARCHAR(20) DEFAULT 'automatic', -- 'automatic', 'manual'
    body_type VARCHAR(30), -- 'sedan', 'suv', 'truck', 'coupe', 'hatchback', 'convertible'
    exterior_color VARCHAR(30),
    interior_color VARCHAR(30),
    vin VARCHAR(17) UNIQUE,
    description TEXT,
    features JSONB, -- Store array of features like ["GPS", "Bluetooth", "Backup Camera"]
    images JSONB, -- Store array of image URLs
    is_featured BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    dealer_notes TEXT, -- Internal notes for staff
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cars_make_model ON cars(make, model);
CREATE INDEX IF NOT EXISTS idx_cars_year ON cars(year);
CREATE INDEX IF NOT EXISTS idx_cars_price ON cars(price);
CREATE INDEX IF NOT EXISTS idx_cars_mileage ON cars(mileage);
CREATE INDEX IF NOT EXISTS idx_cars_condition ON cars(condition);
CREATE INDEX IF NOT EXISTS idx_cars_fuel_type ON cars(fuel_type);
CREATE INDEX IF NOT EXISTS idx_cars_body_type ON cars(body_type);
CREATE INDEX IF NOT EXISTS idx_cars_is_featured ON cars(is_featured);
CREATE INDEX IF NOT EXISTS idx_cars_is_available ON cars(is_available);
CREATE INDEX IF NOT EXISTS idx_cars_created_at ON cars(created_at);
CREATE INDEX IF NOT EXISTS idx_cars_vin ON cars(vin);

-- Create GIN index for JSONB features search
CREATE INDEX IF NOT EXISTS idx_cars_features_gin ON cars USING GIN (features);

-- Create car views for easy querying
CREATE OR REPLACE VIEW available_cars AS
SELECT 
    id,
    make,
    model,
    year,
    price,
    mileage,
    condition,
    fuel_type,
    transmission,
    body_type,
    exterior_color,
    interior_color,
    description,
    features,
    images,
    is_featured,
    created_at,
    updated_at
FROM cars
WHERE is_available = TRUE
ORDER BY is_featured DESC, created_at DESC;

-- Create featured cars view
CREATE OR REPLACE VIEW featured_cars AS
SELECT 
    id,
    make,
    model,
    year,
    price,
    mileage,
    condition,
    fuel_type,
    transmission,
    body_type,
    exterior_color,
    description,
    features,
    images,
    created_at
FROM cars
WHERE is_available = TRUE AND is_featured = TRUE
ORDER BY created_at DESC;

-- Create car inquiries table for customer interest tracking
CREATE TABLE IF NOT EXISTS car_inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    inquiry_type VARCHAR(50) DEFAULT 'general', -- 'general', 'test_drive', 'financing', 'trade_in'
    message TEXT,
    status VARCHAR(20) DEFAULT 'new', -- 'new', 'contacted', 'scheduled', 'completed', 'cancelled'
    follow_up_date TIMESTAMP WITH TIME ZONE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL, -- Staff member assigned
    notes TEXT, -- Internal staff notes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for car inquiries
CREATE INDEX IF NOT EXISTS idx_car_inquiries_car_id ON car_inquiries(car_id);
CREATE INDEX IF NOT EXISTS idx_car_inquiries_user_id ON car_inquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_car_inquiries_status ON car_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_car_inquiries_assigned_to ON car_inquiries(assigned_to);
CREATE INDEX IF NOT EXISTS idx_car_inquiries_created_at ON car_inquiries(created_at);

-- Create saved cars table for user favorites
CREATE TABLE IF NOT EXISTS saved_cars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, car_id)
);

-- Create index for saved cars
CREATE INDEX IF NOT EXISTS idx_saved_cars_user_id ON saved_cars(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_cars_car_id ON saved_cars(car_id);

-- Insert some sample data (commented out - uncomment if you want sample data)
/*
INSERT INTO cars (make, model, year, price, mileage, condition, fuel_type, body_type, exterior_color, description, features, is_featured) VALUES
('Toyota', 'Camry', 2023, 28500.00, 15000, 'certified', 'gasoline', 'sedan', 'Silver', 'Certified Pre-Owned Toyota Camry with excellent condition and full warranty coverage.', '["Bluetooth", "Backup Camera", "Apple CarPlay", "Lane Departure Warning"]', true),
('Honda', 'CR-V', 2022, 32900.00, 22000, 'used', 'gasoline', 'suv', 'Black', 'One owner Honda CR-V with complete service records and excellent maintenance history.', '["All-Wheel Drive", "GPS Navigation", "Heated Seats", "Sunroof"]', true),
('Ford', 'F-150', 2024, 45000.00, 8500, 'used', 'gasoline', 'truck', 'Red', 'Like new Ford F-150 with heavy duty package and minimal mileage.', '["4WD", "Towing Package", "Bed Liner", "Remote Start"]', true);
*/
