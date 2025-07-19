-- Migration: Create personal_ads table for user-generated listings
-- Date: 2025-07-13
-- Description: Add personal_ads table for users to create their own car listings

-- Create personal_ads table
CREATE TABLE IF NOT EXISTS personal_ads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
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
    vin VARCHAR(17),
    description TEXT,
    features JSONB, -- Store array of features like ["GPS", "Bluetooth", "Backup Camera"]
    images JSONB, -- Store array of image URLs
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    location_city VARCHAR(100),
    location_state VARCHAR(50),
    location_zip VARCHAR(10),
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'sold', 'paused', 'expired'
    is_published BOOLEAN DEFAULT FALSE,
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_personal_ads_user_id ON personal_ads(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_ads_make_model ON personal_ads(make, model);
CREATE INDEX IF NOT EXISTS idx_personal_ads_year ON personal_ads(year);
CREATE INDEX IF NOT EXISTS idx_personal_ads_price ON personal_ads(price);
CREATE INDEX IF NOT EXISTS idx_personal_ads_condition ON personal_ads(condition);
CREATE INDEX IF NOT EXISTS idx_personal_ads_status ON personal_ads(status);
CREATE INDEX IF NOT EXISTS idx_personal_ads_is_published ON personal_ads(is_published);
CREATE INDEX IF NOT EXISTS idx_personal_ads_created_at ON personal_ads(created_at);
CREATE INDEX IF NOT EXISTS idx_personal_ads_location ON personal_ads(location_city, location_state);

-- Create GIN index for JSONB features search
CREATE INDEX IF NOT EXISTS idx_personal_ads_features_gin ON personal_ads USING GIN (features);

-- Create view for active personal ads
CREATE OR REPLACE VIEW active_personal_ads AS
SELECT 
    pa.*,
    u.name as seller_name,
    u.phone as seller_phone,
    EXTRACT(EPOCH FROM (expires_at - CURRENT_TIMESTAMP)) / 3600 AS hours_until_expiry
FROM personal_ads pa
JOIN users u ON pa.user_id = u.id
WHERE pa.status = 'active' 
    AND pa.is_published = TRUE 
    AND pa.expires_at > CURRENT_TIMESTAMP
    AND u.is_active = TRUE;

-- Create view for user's own ads (including inactive)
CREATE OR REPLACE VIEW my_personal_ads AS
SELECT 
    pa.*,
    EXTRACT(EPOCH FROM (expires_at - CURRENT_TIMESTAMP)) / 3600 AS hours_until_expiry,
    CASE 
        WHEN expires_at <= CURRENT_TIMESTAMP THEN 'expired'
        ELSE status
    END AS current_status
FROM personal_ads pa
WHERE pa.user_id = current_setting('app.current_user_id')::UUID;

-- Create ad_views table for tracking views
CREATE TABLE IF NOT EXISTS ad_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_id UUID NOT NULL REFERENCES personal_ads(id) ON DELETE CASCADE,
    viewer_ip INET,
    viewer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for ad views
CREATE INDEX IF NOT EXISTS idx_ad_views_ad_id ON ad_views(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_views_viewed_at ON ad_views(viewed_at);

-- Create ad_favorites table for users to save favorite ads
CREATE TABLE IF NOT EXISTS ad_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ad_id UUID NOT NULL REFERENCES personal_ads(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, ad_id)
);

-- Index for ad favorites
CREATE INDEX IF NOT EXISTS idx_ad_favorites_user_id ON ad_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_favorites_ad_id ON ad_favorites(ad_id);

-- Create function to update views count
CREATE OR REPLACE FUNCTION increment_ad_views(ad_uuid UUID, viewer_ip_addr INET DEFAULT NULL, viewer_id UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    -- Insert view record
    INSERT INTO ad_views (ad_id, viewer_ip, viewer_user_id)
    VALUES (ad_uuid, viewer_ip_addr, viewer_id);
    
    -- Update views count
    UPDATE personal_ads 
    SET views_count = views_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ad_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating updated_at
CREATE TRIGGER update_personal_ads_updated_at 
    BEFORE UPDATE ON personal_ads 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically expire old ads
CREATE OR REPLACE FUNCTION expire_old_ads()
RETURNS VOID AS $$
BEGIN
    UPDATE personal_ads 
    SET status = 'expired',
        updated_at = CURRENT_TIMESTAMP
    WHERE expires_at <= CURRENT_TIMESTAMP 
        AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Sample data for testing (optional)
-- INSERT INTO personal_ads (user_id, title, make, model, year, price, mileage, description, contact_phone, contact_email, location_city, location_state, is_published)
-- SELECT id, 'Test Car for Sale', 'Toyota', 'Camry', 2020, 25000, 30000, 'Great condition, one owner', '+1234567890', 'test@example.com', 'Toronto', 'ON', TRUE
-- FROM users WHERE phone = '+1234567890' LIMIT 1;
