const { createClient } = require('@supabase/supabase-js');

class Database {
    constructor() {
        this.supabase = null;
    }

    connect() {
        try {
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseKey) {
                throw new Error('Missing Supabase configuration. Please check SUPABASE_URL and SUPABASE_ANON_KEY in your .env file');
            }

            this.supabase = createClient(supabaseUrl, supabaseKey);
            console.log('Connected to Supabase database');
            return Promise.resolve(this.supabase);
        } catch (error) {
            console.error('Error connecting to Supabase database:', error.message);
            return Promise.reject(error);
        }
    }

    close() {
        // Supabase doesn't require explicit closing
        console.log('Supabase connection closed');
        return Promise.resolve();
    }

    // Helper methods for common operations
    async insert(tableName, data) {
        const { data: result, error } = await this.supabase
            .from(tableName)
            .insert(data)
            .select();
        
        if (error) throw error;
        return result;
    }

    async update(tableName, id, data) {
        const { data: result, error } = await this.supabase
            .from(tableName)
            .update(data)
            .eq('id', id)
            .select();
        
        if (error) throw error;
        return result;
    }

    async delete(tableName, id) {
        const { data: result, error } = await this.supabase
            .from(tableName)
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        return result;
    }

    async get(tableName, id) {
        const { data, error } = await this.supabase
            .from(tableName)
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        return data;
    }

    async all(tableName, options = {}) {
        let query = this.supabase.from(tableName).select('*');
        
        if (options.orderBy) {
            query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending });
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        return data;
    }
}

module.exports = new Database();