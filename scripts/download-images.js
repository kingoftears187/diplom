'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const OUT_DIR = path.join(__dirname, '..', 'images');

const FILES = {
    'hero-trucks.jpg': 'https://images.unsplash.com/photo-1519003722824-cd884d086603?w=1920&q=80&auto=format&fit=crop',
    'about-autopark.jpg': 'https://images.unsplash.com/photo-1601584111127-372cee6d394f?w=1200&q=80&auto=format&fit=crop',
    'contacts-containers.jpg': 'https://images.unsplash.com/photo-1774929105832-81897225bda5?fm=jpg&q=80&w=1200&auto=format&fit=crop',
    'service-truck.jpg': 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=900&q=80&auto=format&fit=crop',
    'service-container.jpg': 'https://images.unsplash.com/photo-1494412519320-aa6133e54249?w=900&q=80&auto=format&fit=crop',
    'service-refrigerated.jpg': 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=900&q=80&auto=format&fit=crop',
    'warehouse.jpg': 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=1200&q=80&auto=format&fit=crop',
};

function download(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const request = (targetUrl) => {
            https.get(targetUrl, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    request(res.headers.location);
                    return;
                }
                if (res.statusCode !== 200) {
                    reject(new Error(`${url} -> HTTP ${res.statusCode}`));
                    return;
                }
                res.pipe(file);
                file.on('finish', () => file.close(() => resolve(dest)));
            }).on('error', reject);
        };
        request(url);
    });
}

async function main() {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    for (const [name, url] of Object.entries(FILES)) {
        const dest = path.join(OUT_DIR, name);
        process.stdout.write(`Downloading ${name}... `);
        await download(url, dest);
        const size = fs.statSync(dest).size;
        process.stdout.write(`${size} bytes\n`);
    }
    console.log('Done:', OUT_DIR);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
