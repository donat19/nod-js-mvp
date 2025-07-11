const { query } = require('../config/database');

class Car {
  constructor(data) {
    this.id = data.id;
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
    this.features = data.features;
    this.images = data.images;
    this.is_featured = data.is_featured;
    this.is_available = data.is_available;
    this.dealer_notes = data.dealer_notes;
    this.created_by = data.created_by;
    this.updated_by = data.updated_by;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Static methods for database operations

  static async findById(id) {
    try {
      const result = await query(
        'SELECT * FROM cars WHERE id = $1 AND is_available = TRUE',
        [id]
      );
      return result.rows.length > 0 ? new Car(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding car by ID:', error);
      throw error;
    }
  }

  static async findByVin(vin) {
    try {
      const result = await query(
        'SELECT * FROM cars WHERE vin = $1',
        [vin]
      );
      return result.rows.length > 0 ? new Car(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding car by VIN:', error);
      throw error;
    }
  }

  static async getAvailable(limit = 50, offset = 0) {
    try {
      const result = await query(
        'SELECT * FROM available_cars LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      return result.rows.map(row => new Car(row));
    } catch (error) {
      console.error('Error getting available cars:', error);
      throw error;
    }
  }

  static async getFeatured(limit = 10) {
    try {
      const result = await query(
        'SELECT * FROM featured_cars LIMIT $1',
        [limit]
      );
      return result.rows.map(row => new Car(row));
    } catch (error) {
      console.error('Error getting featured cars:', error);
      throw error;
    }
  }

  static async search(filters = {}) {
    try {
      let whereConditions = ['is_available = TRUE'];
      let params = [];
      let paramCount = 0;

      // Add filter conditions
      if (filters.make) {
        paramCount++;
        whereConditions.push(`make ILIKE $${paramCount}`);
        params.push(`%${filters.make}%`);
      }

      if (filters.model) {
        paramCount++;
        whereConditions.push(`model ILIKE $${paramCount}`);
        params.push(`%${filters.model}%`);
      }

      if (filters.year_min) {
        paramCount++;
        whereConditions.push(`year >= $${paramCount}`);
        params.push(filters.year_min);
      }

      if (filters.year_max) {
        paramCount++;
        whereConditions.push(`year <= $${paramCount}`);
        params.push(filters.year_max);
      }

      if (filters.price_min) {
        paramCount++;
        whereConditions.push(`price >= $${paramCount}`);
        params.push(filters.price_min);
      }

      if (filters.price_max) {
        paramCount++;
        whereConditions.push(`price <= $${paramCount}`);
        params.push(filters.price_max);
      }

      if (filters.body_type) {
        paramCount++;
        whereConditions.push(`body_type = $${paramCount}`);
        params.push(filters.body_type);
      }

      if (filters.fuel_type) {
        paramCount++;
        whereConditions.push(`fuel_type = $${paramCount}`);
        params.push(filters.fuel_type);
      }

      if (filters.condition) {
        paramCount++;
        whereConditions.push(`condition = $${paramCount}`);
        params.push(filters.condition);
      }

      const whereClause = whereConditions.join(' AND ');
      const orderBy = 'ORDER BY is_featured DESC, created_at DESC';
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;

      paramCount++;
      const limitClause = `LIMIT $${paramCount}`;
      params.push(limit);

      paramCount++;
      const offsetClause = `OFFSET $${paramCount}`;
      params.push(offset);

      const sql = `
        SELECT * FROM cars 
        WHERE ${whereClause} 
        ${orderBy} 
        ${limitClause} ${offsetClause}
      `;

      const result = await query(sql, params);
      return result.rows.map(row => new Car(row));
    } catch (error) {
      console.error('Error searching cars:', error);
      throw error;
    }
  }

  static async create(carData) {
    try {
      const result = await query(
        `INSERT INTO cars (
          make, model, year, price, mileage, condition, fuel_type, 
          transmission, body_type, exterior_color, interior_color, 
          vin, description, features, images, is_featured, dealer_notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) 
        RETURNING *`,
        [
          carData.make, carData.model, carData.year, carData.price,
          carData.mileage, carData.condition, carData.fuel_type,
          carData.transmission, carData.body_type, carData.exterior_color,
          carData.interior_color, carData.vin, carData.description,
          JSON.stringify(carData.features || []), JSON.stringify(carData.images || []),
          carData.is_featured || false, carData.dealer_notes, carData.created_by
        ]
      );
      return new Car(result.rows[0]);
    } catch (error) {
      console.error('Error creating car:', error);
      throw error;
    }
  }

  // Instance methods

  async save() {
    try {
      if (this.id) {
        // Update existing car
        const result = await query(
          `UPDATE cars 
           SET make = $1, model = $2, year = $3, price = $4, mileage = $5,
               condition = $6, fuel_type = $7, transmission = $8, body_type = $9,
               exterior_color = $10, interior_color = $11, vin = $12, 
               description = $13, features = $14, images = $15, is_featured = $16,
               dealer_notes = $17, updated_by = $18, updated_at = CURRENT_TIMESTAMP
           WHERE id = $19 
           RETURNING *`,
          [
            this.make, this.model, this.year, this.price, this.mileage,
            this.condition, this.fuel_type, this.transmission, this.body_type,
            this.exterior_color, this.interior_color, this.vin, this.description,
            JSON.stringify(this.features || []), JSON.stringify(this.images || []),
            this.is_featured, this.dealer_notes, this.updated_by, this.id
          ]
        );
        
        if (result.rows.length > 0) {
          Object.assign(this, result.rows[0]);
        }
      } else {
        throw new Error('Use Car.create() for new cars');
      }
      
      return this;
    } catch (error) {
      console.error('Error saving car:', error);
      throw error;
    }
  }

  async delete() {
    try {
      // Soft delete - mark as unavailable
      await query(
        'UPDATE cars SET is_available = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [this.id]
      );
      
      this.is_available = false;
      return true;
    } catch (error) {
      console.error('Error deleting car:', error);
      throw error;
    }
  }

  // Return car data without sensitive information
  toJSON() {
    return {
      id: this.id,
      make: this.make,
      model: this.model,
      year: this.year,
      price: this.price,
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
      is_featured: this.is_featured,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  // Return minimal car data for listings
  toListingJSON() {
    return {
      id: this.id,
      make: this.make,
      model: this.model,
      year: this.year,
      price: this.price,
      mileage: this.mileage,
      condition: this.condition,
      body_type: this.body_type,
      exterior_color: this.exterior_color,
      images: this.images ? this.images[0] : null, // First image only
      is_featured: this.is_featured
    };
  }
}

module.exports = Car;
