const { networkInterfaces } = require('os');
const fs = require('fs');
const path = require('path');

function getLocalIp() {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return '127.0.0.1';
}

const ip = getLocalIp();
console.log(`\n🔍 Detected Local Network IP: ${ip}`);

// Update .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    // Replace the API URL to use the detected IP
    envContent = envContent.replace(
        /NEXT_PUBLIC_API_URL=http:\/\/[^\s:]+:8010/g,
        `NEXT_PUBLIC_API_URL=http://${ip}:8010`
    );
    fs.writeFileSync(envPath, envContent);
    console.log(`✅ [Frontend] .env.local updated with API_URL=http://${ip}:8010`);
} else {
    console.log(`⚠️ .env.local not found at ${envPath}`);
}

// Update backend CORS
const backendMainPath = path.join(__dirname, '..', '..', 'server', 'app', 'main.py');
if (fs.existsSync(backendMainPath)) {
    let mainContent = fs.readFileSync(backendMainPath, 'utf8');

    // Use a more precise replacement using the capacitor:// string as an anchor
    const corsRegex = /"capacitor:\/\/[^"]+",\s*"http:\/\/[^"]+:3010",\s*"http:\/\/[^"]+:3000",/g;
    const newCorsLines = `"capacitor://${ip}",\n    "http://${ip}:3010",\n    "http://${ip}:3000",`;

    if (corsRegex.test(mainContent)) {
        mainContent = mainContent.replace(corsRegex, newCorsLines);
        fs.writeFileSync(backendMainPath, mainContent);
        console.log(`✅ [Backend] app/main.py CORS origins updated with IP ${ip}`);
    } else {
        console.log(`⚠️ Could not find the CORS block in server/app/main.py to replace.`);
    }
} else {
    console.log(`⚠️ server/app/main.py not found at ${backendMainPath}`);
}

console.log('🚀 Network configured for cross-device iOS testing.\n');
