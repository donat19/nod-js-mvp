const { query, transaction } = require('../config/database');

class PersonalAd {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.title = data.title;
    this.make = data.make;
    this.model = data.model;
    this.year = data.year;
    this.price = data.price;
    this.mileage = data.mileage;
    this.condition = data.condition;
    this.fuel_type = data.fuel_type;
    this.transmission = data.transmission;
    this.body_type = data.body_type;
    this.exterior_color = data.exterior_color;
    this.interior_color = data.interior_color;
    this.vin = data.vin;
    this.description = data.description;
    this.features = data.features || [];
    this.images = data.images || [];
    this.contact_phone = data.contact_phone;
    this.contact_email = data.contact_email;
    this.location_city = data.location_city;
    this.location_state = data.location_state;
    this.location_zip = data.location_zip;
    this.status = data.status || 'active';
    this.is_published = data.is_published || false;
    this.views_count = data.views_count || 0;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.expires_at = data.expires_at;
  }

  // Static methods for database operations

  static async create(adData) {
    try {
      const {
        user_id, title, make, model, year, price, mileage, condition,
        fuel_type, transmission, body_type, exterior_color, interior_color,
        vin, description, features, images, contact_phone, contact_email,
        location_city, location_state, location_zip, is_published
      } = adData;

      const result = await query(`
        INSERT INTO personal_ads (
          user_id, title, make, model, year, price, mileage, condition,
          fuel_type, transmission, body_type, exterior_color, interior_color,
          vin, description, features, images, contact_phone, contact_email,
          location_city, location_state, location_zip, is_published
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
        ) RETURNING *
      `, [
        user_id, title, make, model, year, price, mileage, condition,
        fuel_type, transmission, body_type, exterior_color, interior_color,
        vin, description, JSON.stringify(features), JSON.stringify(images),
        contact_phone, contact_email, location_city, location_state,
        location_zip, is_published
      ]);

      return new PersonalAd(result.rows[0]);
    } catch (error) {
      console.error('Error creating personal ad:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const result = await query(`
        SELECT pa.*, u.name as seller_name 
        FROM personal_ads pa
        JOIN users u ON pa.user_id = u.id
        WHERE pa.id = $1
      `, [id]);
      
      return result.rows.length > 0 ? new PersonalAd(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding personal ad by ID:', error);
      throw error;
    }
  }

  static async findByUserId(userId, includeInactive = false) {
    try {
      let whereClause = 'WHERE user_id = $1';
      if (!includeInactive) {
        whereClause += " AND status != 'expired' AND expires_at > CURRENT_TIMESTAMP";
      }

      const result = await query(`
        SELECT *, 
               EXTRACT(EPOCH FROM (expires_at - CURRENT_TIMESTAMP)) / 3600 AS hours_until_expiry
        FROM personal_ads 
        ${whereClause}
        ORDER BY created_at DESC
      `, [userId]);

      return result.rows.map(row => new PersonalAd(row));
    } catch (error) {
      console.error('Error finding personal ads by user ID:', error);
      throw error;
    }
  }

  static async search(filters = {}) {
    try {
      const {
        make, model, minYear, maxYear, minPrice, maxPrice,
        condition, fuel_type, transmission, body_type,
        location_city, location_state, features,
        limit = 20, offset = 0
      } = filters;

      let whereConditions = [
        "status = 'active'",
        "is_published = TRUE",
        "expires_at > CURRENT_TIMESTAMP"
      ];
      let params = [];
      let paramCount = 0;

      // Add filters
      if (make) {
        paramCount++;
        whereConditions.push(`make ILIKE $${paramCount}`);
        params.push(`%${make}%`);
      }

      if (model) {
        paramCount++;
        whereConditions.push(`model ILIKE $${paramCount}`);
        params.push(`%${model}%`);
      }

      if (minYear) {
        paramCount++;
        whereConditions.push(`year >= $${paramCount}`);
        params.push(minYear);
      }

      if (maxYear) {
        paramCount++;
        whereConditions.push(`year <= $${paramCount}`);
        params.push(maxYear);
      }

      if (minPrice) {
        paramCount++;
        whereConditions.push(`price >= $${paramCount}`);
        params.push(minPrice);
      }

      if (maxPrice) {
        paramCount++;
        whereConditions.push(`price <= $${paramCount}`);
        params.push(maxPrice);
      }

      if (condition) {
        paramCount++;
        whereConditions.push(`condition = $${paramCount}`);
        params.push(condition);
      }

      if (fuel_type) {
        paramCount++;
        whereConditions.push(`fuel_type = $${paramCount}`);
        params.push(fuel_type);
      }

      if (transmission) {
        paramCount++;
        whereConditions.push(`transmission = $${paramCount}`);
        params.push(transmission);
      }

      if (body_type) {
        paramCount++;
        whereConditions.push(`body_type = $${paramCount}`);
        params.push(body_type);
      }

      if (location_city) {
        paramCount++;
        whereConditions.push(`location_city ILIKE $${paramCount}`);
        params.push(`%${location_city}%`);
      }

      if (location_state) {
        paramCount++;
        whereConditions.push(`location_state ILIKE $${paramCount}`);
        params.push(`%${location_state}%`);
      }

      if (features && features.length > 0) {
        paramCount++;
        whereConditions.push(`features @> $${paramCount}::jsonb`);
        params.push(JSON.stringify(features));
      }

      // Add limit and offset
      paramCount++;
      const limitParam = paramCount;
      paramCount++;
      const offsetParam = paramCount;
      params.push(limit, offset);

      const result = await query(`
        SELECT pa.*, u.name as seller_name,
               EXTRACT(EPOCH FROM (expires_at - CURRENT_TIMESTAMP)) / 3600 AS hours_until_expiry
        FROM personal_ads pa
        JOIN users u ON pa.user_id = u.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT $${limitParam} OFFSET $${offsetParam}
      `, params);

      return result.rows.map(row => new PersonalAd(row));
    } catch (error) {
      console.error('Error searching personal ads:', error);
      throw error;
    }
  }

  static async getActiveAds(limit = 20, offset = 0) {
    try {
      const result = await query(`
        SELECT pa.*, u.name as seller_name,
               EXTRACT(EPOCH FROM (expires_at - CURRENT_TIMESTAMP)) / 3600 AS hours_until_expiry
        FROM personal_ads pa
        JOIN users u ON pa.user_id = u.id
        WHERE pa.status = 'active' 
          AND pa.is_published = TRUE 
          AND pa.expires_at > CURRENT_TIMESTAMP
          AND u.is_active = TRUE
        ORDER BY pa.created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);

      return result.rows.map(row => new PersonalAd(row));
    } catch (error) {
      console.error('Error getting active personal ads:', error);
      throw error;
    }
  }

  // Instance methods

  async save() {
    try {
      const result = await query(`
        UPDATE personal_ads SET
          title = $2, make = $3, model = $4, year = $5, price = $6,
          mileage = $7, condition = $8, fuel_type = $9, transmission = $10,
          body_type = $11, exterior_color = $12, interior_color = $13,
          vin = $14, description = $15, features = $16, images = $17,
          contact_phone = $18, contact_email = $19, location_city = $20,
          location_state = $21, location_zip = $22, status = $23,
          is_published = $24, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [
        this.id, this.title, this.make, this.model, this.year, this.price,
        this.mileage, this.condition, this.fuel_type, this.transmission,
        this.body_type, this.exterior_color, this.interior_color,
        this.vin, this.description, JSON.stringify(this.features),
        JSON.stringify(this.images), this.contact_phone, this.contact_email,
        this.location_city, this.location_state, this.location_zip,
        this.status, this.is_published
      ]);

      if (result.rows.length > 0) {
        Object.assign(this, result.rows[0]);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error saving personal ad:', error);
      throw error;
    }
  }

  async delete() {
    try {
      await query('DELETE FROM personal_ads WHERE id = $1', [this.id]);
      return true;
    } catch (error) {
      console.error('Error deleting personal ad:', error);
      throw error;
    }
  }

  async markAsSold() {
    try {
      this.status = 'sold';
      return await this.save();
    } catch (error) {
      console.error('Error marking ad as sold:', error);
      throw error;
    }
  }

  async publish() {
    try {
      this.is_published = true;
      return await this.save();
    } catch (error) {
      console.error('Error publishing ad:', error);
      throw error;
    }
  }

  async unpublish() {
    try {
      this.is_published = false;
      return await this.save();
    } catch (error) {
      console.error('Error unpublishing ad:', error);
      throw error;
    }
  }

  async incrementViews(viewerIp = null, viewerId = null) {
    try {
      await query('SELECT increment_ad_views($1, $2, $3)', [
        this.id, viewerIp, viewerId
      ]);
      this.views_count += 1;
    } catch (error) {
      console.error('Error incrementing ad views:', error);
      throw error;
    }
  }

  async addToFavorites(userId) {
    try {
      await query(`
        INSERT INTO ad_favorites (user_id, ad_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, ad_id) DO NOTHING
      `, [userId, this.id]);
      return true;
    } catch (error) {
      console.error('Error adding ad to favorites:', error);
      throw error;
    }
  }

  async removeFromFavorites(userId) {
    try {
      await query(`
        DELETE FROM ad_favorites 
        WHERE user_id = $1 AND ad_id = $2
      `, [userId, this.id]);
      return true;
    } catch (error) {
      console.error('Error removing ad from favorites:', error);
      throw error;
    }
  }

  static async getFavoritesByUserId(userId) {
    try {
      const result = await query(`
        SELECT pa.*, u.name as seller_name,
               EXTRACT(EPOCH FROM (expires_at - CURRENT_TIMESTAMP)) / 3600 AS hours_until_expiry
        FROM personal_ads pa
        JOIN ad_favorites af ON pa.id = af.ad_id
        JOIN users u ON pa.user_id = u.id
        WHERE af.user_id = $1
          AND pa.status = 'active'
          AND pa.is_published = TRUE
          AND pa.expires_at > CURRENT_TIMESTAMP
        ORDER BY af.created_at DESC
      `, [userId]);

      return result.rows.map(row => new PersonalAd(row));
    } catch (error) {
      console.error('Error getting favorite ads:', error);
      throw error;
    }
  }

  // Helper method to get formatted data for API responses
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      title: this.title,
      make: this.make,
      model: this.model,
      year: this.year,
      price: parseFloat(this.price),
      mileage: this.mileage,
      condition: this.condition,
      fuel_type: this.fuel_type,
      transmission: this.transmission,
      body_type: this.body_type,
      exterior_color: this.exterior_color,
      interior_color: this.interior_color,
      vin: this.vin,
      description: this.description,
      features: this.features,
      images: this.images,
      contact_phone: this.contact_phone,
      contact_email: this.contact_email,
      location_city: this.location_city,
      location_state: this.location_state,
      location_zip: this.location_zip,
      status: this.status,
      is_published: this.is_published,
      views_count: this.views_count,
      created_at: this.created_at,
      updated_at: this.updated_at,
      expires_at: this.expires_at,
      seller_name: this.seller_name,
      hours_until_expiry: this.hours_until_expiry
    };
  }
}

module.exports = PersonalAd;
