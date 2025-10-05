import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

export const createUser = async (fullName, email, password) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await pool.query(
    'INSERT INTO users (full_name, email, password) VALUES ($1, $2, $3) RETURNING *',
    [fullName, email, hashedPassword]
  );
  return result.rows[0];
};

export const findUserByEmail = async (email) => {
  const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
  return result.rows[0];
};
