const fs = require('fs');
const https = require('https');

// A fallback script to generate a basic banner structure using standard tools if Gemini Image API fails due to quota.
// For now we will just create a highly styled HTML that can be screenshot.

const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=1200, height=628, initial-scale=1.0">
    <style>
        body, html {
            margin: 0;
            padding: 0;
            width: 1200px;
            height: 628px;
            background-color: #0d0d0d;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }
        
        .glow {
            position: absolute;
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, rgba(197, 160, 89, 0.15) 0%, rgba(13, 13, 13, 0) 70%);
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            border-radius: 50%;
            z-index: 1;
        }

        .grid {
            position: absolute;
            width: 200%;
            height: 200%;
            background-image: 
                linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
            background-size: 40px 40px;
            top: -50%;
            left: -50%;
            transform: perspective(500px) rotateX(60deg) translateY(-100px) translateZ(-200px);
            z-index: 0;
            opacity: 0.5;
        }

        .content {
            z-index: 10;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .logo-container {
            width: 120px;
            height: 120px;
            background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%);
            border: 1px solid rgba(197, 160, 89, 0.3);
            border-radius: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 32px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1);
            position: relative;
        }
        
        .logo-container::after {
            content: '';
            position: absolute;
            top: -1px; left: -1px; right: -1px; bottom: -1px;
            border-radius: 30px;
            background: linear-gradient(135deg, rgba(197, 160, 89, 0.5), transparent 40%);
            z-index: -1;
        }

        .feather {
            font-size: 56px;
            color: #c5a059;
            filter: drop-shadow(0 0 10px rgba(197, 160, 89, 0.5));
        }

        h1 {
            color: white;
            font-size: 72px;
            font-weight: 700;
            letter-spacing: -0.02em;
            margin: 0 0 16px 0;
            background: linear-gradient(180deg, #ffffff 0%, rgba(255, 255, 255, 0.7) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        p {
            color: #888888;
            font-size: 28px;
            font-weight: 400;
            margin: 0;
            letter-spacing: 0.01em;
        }

        .accent {
            color: #c5a059;
            -webkit-text-fill-color: #c5a059;
        }
        
        .cards {
            position: absolute;
            right: 100px;
            top: 50%;
            transform: translateY(-50%) rotate(10deg);
            z-index: 5;
            display: flex;
            gap: 20px;
        }
        
        .card {
            width: 160px;
            height: 240px;
            background: #121212;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.05);
            box-shadow: 0 20px 40px rgba(0,0,0,0.8);
            transform-style: preserve-3d;
        }
        
        .card:nth-child(1) { transform: translateZ(-50px) translateY(40px) rotate(-15deg); opacity: 0.6; }
        .card:nth-child(2) { transform: translateZ(0) translateY(0) rotate(-5deg); border-color: rgba(197, 160, 89, 0.2); }
        .card:nth-child(3) { transform: translateZ(50px) translateY(-40px) rotate(5deg); opacity: 0.4; }
    </style>
</head>
<body>
    <div class="grid"></div>
    <div class="glow"></div>
    
    <div class="content">
        <div class="logo-container">
            <span class="feather">✒️</span>
        </div>
        <h1>Storio</h1>
        <p>Collect stories in your <span class="accent">Folio</span>.</p>
    </div>
    
    <div class="cards">
        <div class="card"></div>
        <div class="card"></div>
        <div class="card"></div>
    </div>
</body>
</html>`;

fs.writeFileSync('temp_banner/banner.html', html);
console.log('Created HTML template for banner at temp_banner/banner.html');
