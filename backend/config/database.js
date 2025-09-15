const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class Database {
    constructor() {
        this.supabase = null;
    }

    connect() {
        return new Promise((resolve, reject) => {
            try {
                const supabaseUrl = process.env.SUPABASE_URL;
                const supabaseKey = process.env.SUPABASE_ANON_KEY;
                
                if (!supabaseUrl || !supabaseKey) {
                    throw new Error('Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
                }
                
                this.supabase = createClient(supabaseUrl, supabaseKey);
                console.log('Connected to Supabase database');
                resolve(this.supabase);
            } catch (err) {
                console.error('Error connecting to Supabase:', err.message);
                reject(err);
            }
        });
    }

    close() {
        return new Promise((resolve) => {
            // Supabase client doesn't need explicit closing
            console.log('Supabase connection closed');
            resolve();
        });
    }

    async run(sql, params = []) {
        // For Supabase, we'll use the table methods instead of raw SQL
        // This method is kept for compatibility but should be replaced with specific table operations
        throw new Error('Use specific table methods (insert, update, delete) instead of raw SQL');
    }

    async get(tableName, filters = {}) {
        try {
            let query = this.supabase.from(tableName).select('*');
            
            // Apply filters
            Object.keys(filters).forEach(key => {
                query = query.eq(key, filters[key]);
            });
            
            const { data, error } = await query.single();
            
            if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
                throw error;
            }
            
            return data;
        } catch (err) {
            throw err;
        }
    }

    async all(tableName, filters = {}, orderBy = null) {
        try {
            let query = this.supabase.from(tableName).select('*');
            
            // Apply filters
            Object.keys(filters).forEach(key => {
                query = query.eq(key, filters[key]);
            });
            
            // Apply ordering
            if (orderBy) {
                query = query.order(orderBy.column, { ascending: orderBy.ascending || true });
            }
            
            const { data, error } = await query;
            
            if (error) {
                throw error;
            }
            
            return data || [];
        } catch (err) {
            throw err;
        }
    }

    async insert(tableName, data) {
        try {
            const { data: result, error } = await this.supabase
                .from(tableName)
                .insert(data)
                .select()
                .single();
            
            if (error) {
                throw error;
            }
            
            return { id: result.id, changes: 1 };
        } catch (err) {
            throw err;
        }
    }

    async update(tableName, id, data) {
        try {
            const { data: result, error } = await this.supabase
                .from(tableName)
                .update(data)
                .eq('id', id)
                .select()
                .single();
            
            if (error) {
                throw error;
            }
            
            return { id: result.id, changes: 1 };
        } catch (err) {
            throw err;
        }
    }

    async delete(tableName, id) {
        try {
            const { error } = await this.supabase
                .from(tableName)
                .delete()
                .eq('id', id);
            
            if (error) {
                throw error;
            }
            
            return { changes: 1 };
        } catch (err) {
            throw err;
        }
    }
}

module.exports = new Database();