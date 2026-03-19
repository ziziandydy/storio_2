const fs = require('fs');
const path = require('path');

// Read the actual logo to base64 so it can be embedded easily
const logoPath = path.resolve(__dirname, '../image/logo/logo.png');
let logoBase64 = '';
try {
    const logoData = fs.readFileSync(logoPath);
    logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`;
} catch (err) {
    console.error('Error reading logo:', err);
}

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
            position: relative;
            color: white;
        }
        
        /* Ethereal background light */
        .glow-main {
            position: absolute;
            width: 800px;
            height: 800px;
            background: radial-gradient(circle, rgba(197, 160, 89, 0.15) 0%, rgba(13, 13, 13, 0) 70%);
            top: 50%;
            left: 30%;
            transform: translate(-50%, -50%);
            border-radius: 50%;
            z-index: 1;
            filter: blur(40px);
        }

        .glow-accent {
            position: absolute;
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, rgba(13, 13, 13, 0) 60%);
            top: 20%;
            right: 10%;
            border-radius: 50%;
            z-index: 1;
            filter: blur(30px);
        }

        /* Abstract glowing threads (Digital Pensieve metaphor) */
        .threads {
            position: absolute;
            width: 100%;
            height: 100%;
            z-index: 2;
            opacity: 0.3;
        }
        .thread {
            position: absolute;
            background: linear-gradient(90deg, transparent, #c5a059, transparent);
            height: 1px;
            border-radius: 50%;
            filter: blur(2px);
        }
        .t1 { top: 30%; left: -10%; width: 60%; transform: rotate(15deg); opacity: 0.5; }
        .t2 { top: 60%; left: 10%; width: 50%; transform: rotate(-10deg); opacity: 0.8; height: 2px; }
        .t3 { top: 80%; left: 40%; width: 70%; transform: rotate(-5deg); opacity: 0.4; }

        .container {
            position: relative;
            z-index: 10;
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            height: 100%;
            padding: 0 80px;
            box-sizing: border-box;
        }

        /* Left Side: Logo and Text */
        .brand-section {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            max-width: 600px;
        }

        .logo-container {
            width: 140px;
            height: 140px;
            margin-bottom: 24px;
            border-radius: 32px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 20px 50px rgba(0,0,0,0.8), 0 0 0 1px rgba(197, 160, 89, 0.2);
            background: linear-gradient(135deg, rgba(26,26,26,0.8) 0%, rgba(13,13,13,0.8) 100%);
            backdrop-filter: blur(10px);
        }

        .logo-container img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            transform: scale(1.1); /* Optional tweak if logo has too much padding */
        }

        h1 {
            font-size: 88px;
            font-weight: 800;
            letter-spacing: -0.02em;
            margin: 0 0 16px 0;
            /* Storio Gold Gradient */
            background: linear-gradient(135deg, #f2e2be 0%, #c5a059 50%, #8a6a2e 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            filter: drop-shadow(0px 4px 20px rgba(197, 160, 89, 0.3));
        }

        p {
            color: #a0a0a0;
            font-size: 32px;
            font-weight: 300;
            margin: 0;
            letter-spacing: 0.02em;
            line-height: 1.4;
        }

        .accent {
            color: #c5a059;
            font-weight: 500;
        }

        /* Right Side: Floating Abstract Cards representing Books & Movies */
        .cards-section {
            position: relative;
            width: 450px;
            height: 450px;
            perspective: 1000px;
            transform-style: preserve-3d;
        }

        .card {
            position: absolute;
            width: 200px;
            height: 300px;
            border-radius: 16px;
            background: rgba(18, 18, 18, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            box-shadow: 0 30px 60px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.1);
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        /* Movie Card */
        .card-movie {
            top: 20px;
            right: 180px;
            transform: translateZ(50px) rotateY(-15deg) rotateX(10deg);
            z-index: 3;
            border-left: 20px solid rgba(0,0,0,0.8);
            border-right: 20px solid rgba(0,0,0,0.8);
            background: linear-gradient(to bottom, #121212, #000);
        }
        
        /* Film strip holes */
        .card-movie::before, .card-movie::after {
            content: '';
            position: absolute;
            top: 0; bottom: 0;
            width: 8px;
            background-image: radial-gradient(circle at center, rgba(255,255,255,0.2) 2px, transparent 3px);
            background-size: 10px 20px;
        }
        .card-movie::before { left: -14px; }
        .card-movie::after { right: -14px; }

        /* Book Card */
        .card-book {
            top: 100px;
            right: 20px;
            transform: translateZ(0px) rotateY(-25deg) rotateX(5deg);
            z-index: 2;
            border-left: 12px solid #c5a059;
            background: linear-gradient(135deg, #1a1a1a, #0a0a0a);
            box-shadow: -10px 0 20px rgba(0,0,0,0.5), 0 30px 60px rgba(0,0,0,0.8);
            padding: 24px;
        }
        
        /* Book pages hint */
        .card-book::after {
            content: '';
            position: absolute;
            right: 0; top: 2px; bottom: 2px;
            width: 6px;
            background: repeating-linear-gradient(to bottom, #333, #333 1px, #1a1a1a 2px);
            border-radius: 0 4px 4px 0;
        }

        .book-lines {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            gap: 12px;
            opacity: 0.3;
        }
        .b-line { height: 6px; background: #fff; border-radius: 3px; }
        .b-line:nth-child(1) { width: 80%; height: 12px; margin-bottom: 12px; background: #c5a059; }
        .b-line:nth-child(2) { width: 100%; }
        .b-line:nth-child(3) { width: 90%; }
        .b-line:nth-child(4) { width: 40%; margin-bottom: 20px; }
        .b-line:nth-child(5) { width: 100%; }
        .b-line:nth-child(6) { width: 85%; }

        /* Generic Background Card */
        .card-bg {
            top: -20px;
            right: 100px;
            transform: translateZ(-100px) rotateY(-5deg) rotateX(15deg);
            z-index: 1;
            opacity: 0.5;
            background: rgba(197, 160, 89, 0.05);
            border-color: rgba(197, 160, 89, 0.2);
        }

        .poster-image-placeholder {
            width: 100%;
            height: 100%;
            background: linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.05) 50%, transparent 60%);
            background-size: 200% 200%;
            animation: shimmer 5s infinite linear;
        }

        @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
        
    </style>
</head>
<body>
    <div class="glow-main"></div>
    <div class="glow-accent"></div>
    
    <div class="threads">
        <div class="thread t1"></div>
        <div class="thread t2"></div>
        <div class="thread t3"></div>
    </div>
    
    <div class="container">
        <!-- Left Side: Branding -->
        <div class="brand-section">
            <div class="logo-container">
                <img src="${logoBase64}" alt="Storio Logo">
            </div>
            <h1>Storio</h1>
            <p>Collect stories in your <span class="accent">Folio</span>.</p>
        </div>
        
        <!-- Right Side: Imagery (Books & Movies) -->
        <div class="cards-section">
            <div class="card card-bg"></div>
            
            <div class="card card-book">
                <div class="book-lines">
                    <div class="b-line"></div>
                    <div class="b-line"></div>
                    <div class="b-line"></div>
                    <div class="b-line"></div>
                    <div class="b-line"></div>
                    <div class="b-line"></div>
                </div>
            </div>
            
            <div class="card card-movie">
                <div class="poster-image-placeholder"></div>
            </div>
        </div>
    </div>
</body>
</html>`;

fs.writeFileSync(path.resolve(__dirname, 'banner_v2.html'), html);
console.log('Created HTML template v2');
