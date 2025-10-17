const fetch = require('node-fetch');

async function testAPI() {
    try {
        console.log('🧪 Probando API de ROSTOB PUBLICACIONES...\n');
        
        // Test 1: Health check
        console.log('1. Test Health Check:');
        const healthResponse = await fetch('http://localhost:3000/api/health');
        const healthData = await healthResponse.json();
        console.log('✅ Status:', healthResponse.status);
        console.log('📊 Resultado:', healthData);
        console.log('');
        
        // Test 2: Login
        console.log('2. Test Login Admin:');
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@bookstore.com',
                password: 'admin123'
            })
        });
        
        const loginData = await loginResponse.json();
        console.log('✅ Status:', loginResponse.status);
        console.log('📊 Resultado:', loginData);
        console.log('');
        
        // Test 3: Login Employee
        console.log('3. Test Login Employee:');
        const empLoginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'empleado@bookstore.com',
                password: 'empleado456'
            })
        });
        
        const empLoginData = await empLoginResponse.json();
        console.log('✅ Status:', empLoginResponse.status);
        console.log('📊 Resultado:', empLoginData);
        console.log('');
        
        // Test 4: Login Customer
        console.log('4. Test Login Customer:');
        const custLoginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'cliente@email.com',
                password: 'cliente789'
            })
        });
        
        const custLoginData = await custLoginResponse.json();
        console.log('✅ Status:', custLoginResponse.status);
        console.log('📊 Resultado:', custLoginData);
        
    } catch (error) {
        console.error('❌ Error en las pruebas:', error.message);
    }
}

testAPI();