const bcrypt = require('bcryptjs');

// Nuevas contraseñas para cada usuario
const passwords = {
  'admin@bookstore.com': 'admin123',
  'empleado@bookstore.com': 'empleado456', 
  'cliente@email.com': 'cliente789'
};

async function updatePasswords() {
  const saltRounds = 10;
  
  for (const [email, password] of Object.entries(passwords)) {
    try {
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      console.log(`UPDATE users SET password = '${hashedPassword}' WHERE email = '${email}';`);
    } catch (error) {
      console.error(`Error hashing password for ${email}:`, error);
    }
  }
  
  console.log('\n--- Nuevas credenciales ---');
  for (const [email, password] of Object.entries(passwords)) {
    console.log(`${email} -> ${password}`);
  }
}

updatePasswords();