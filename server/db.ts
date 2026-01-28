import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

const dbPromise = open({
  filename: './database.sqlite',
  driver: sqlite3.Database
});

export const initDb = async () => {
  const db = await dbPromise;

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      storage_limit INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      parent_id TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      size INTEGER NOT NULL,
      path TEXT,
      mime_type TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS shared_files (
      id TEXT PRIMARY KEY,
      file_id TEXT NOT NULL,
      from_user_id TEXT NOT NULL,
      to_user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (file_id) REFERENCES files(id),
      FOREIGN KEY (from_user_id) REFERENCES users(id),
      FOREIGN KEY (to_user_id) REFERENCES users(id),
      UNIQUE(file_id, to_user_id)
    );
  `);

  // Seed Users
  const adminEmail = 'admin@fluxlocal.com';
  const adminExists = await db.get('SELECT * FROM users WHERE email = ?', adminEmail);

  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('123', 10);
    const adminId = uuidv4();
    await db.run(
      'INSERT INTO users (id, username, email, password, role, storage_limit) VALUES (?, ?, ?, ?, ?, ?)',
      adminId, 'Admin', adminEmail, hashedPassword, 'admin', 10737418240 // 10GB
    );
    console.log('Admin user created');
    
    // Create upload folder for admin
    const uploadDir = path.join(process.cwd(), 'uploads', adminId);
    if (!fs.existsSync(uploadDir)){
        fs.mkdirSync(uploadDir, { recursive: true });
    }
  }

  const userEmail = 'user@fluxlocal.com';
  const userExists = await db.get('SELECT * FROM users WHERE email = ?', userEmail);

  if (!userExists) {
    const hashedPassword = await bcrypt.hash('123', 10);
    const userId = uuidv4();
    await db.run(
      'INSERT INTO users (id, username, email, password, role, storage_limit) VALUES (?, ?, ?, ?, ?, ?)',
      userId, 'User', userEmail, hashedPassword, 'user', 2147483648 // 2GB
    );
    console.log('Demo user created');

    // Create upload folder for user
    const uploadDir = path.join(process.cwd(), 'uploads', userId);
    if (!fs.existsSync(uploadDir)){
        fs.mkdirSync(uploadDir, { recursive: true });
    }
  }
};

export const getDb = async () => {
  return await dbPromise;
};
