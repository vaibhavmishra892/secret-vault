const http = require('http');

const MASTER_KEY = 'a'.repeat(64); // 32-byte hex key (dummy for test)
const PORT = 3000;

function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'x-master-key': MASTER_KEY
            }
        };

        const req = http.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTests() {
    console.log('--- Starting Verification ---');

    console.log('1. Creating Secret...');
    const createRes = await request('POST', '/secrets', { name: 'db-pass', value: 'secret123' });
    if (createRes.status !== 201) throw new Error(`Create failed: ${JSON.stringify(createRes)}`);
    const secretId = createRes.data.id;
    console.log(`   Success. ID: ${secretId}`);

    console.log('2. Reading Secret...');
    const readRes = await request('GET', `/secrets/${secretId}`);
    if (readRes.status !== 200 || readRes.data.value !== 'secret123') throw new Error(`Read failed: ${JSON.stringify(readRes)}`);
    console.log(`   Success. Value matches: ${readRes.data.value}`);

    console.log('3. Rotating Secret...');
    const rotateRes = await request('POST', `/secrets/rotate/${secretId}`);
    if (rotateRes.status !== 200) throw new Error(`Rotate failed: ${JSON.stringify(rotateRes)}`);
    console.log('   Success. Creating rotation...');

    console.log('4. Verifying New Value...');
    const verifyRes = await request('GET', `/secrets/${secretId}`);
    if (verifyRes.status !== 200 || verifyRes.data.value === 'secret123') throw new Error(`Verification failed: Value unchanged or error: ${JSON.stringify(verifyRes)}`);
    console.log(`   Success. New Value: ${verifyRes.data.value}`);

    console.log('--- Verification Complete ---');
}

runTests().catch(err => {
    console.error('Test Failed:', err);
    process.exit(1);
});
