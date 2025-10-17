const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'rostob_postgres',
  database: 'rostob_publicaciones_db',
  password: 'postgres123',
  port: 5432,
});

async function resetPasswords() {
  try {
    console.log('🔄 Reseteando contraseñas...');
    
    // Contraseñas simples para testing
    const users = [
      { email: 'admin@bookstore.com', password: 'admin123' },
      { email: 'empleado@bookstore.com', password: 'empleado456' },
      { email: 'cliente@email.com', password: 'cliente789' }
    ];
    
    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      await pool.query(
        'UPDATE users SET password = $1 WHERE email = $2',
        [hashedPassword, user.email]
      );
      
      console.log(`✅ Contraseña actualizada para: ${user.email}`);
    }
    
    console.log('\n🎉 Todas las contraseñas actualizadas correctamente');
    console.log('\n📋 Credenciales:');
    users.forEach(user => {
      console.log(`- ${user.email} -> ${user.password}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

resetPasswords();