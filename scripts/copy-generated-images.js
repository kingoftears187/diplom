'use strict';

const fs = require('fs');
const path = require('path');

const SRC = path.join('C:', 'Users', 'roleg', '.cursor', 'projects', 'empty-window', 'assets');
const DEST = path.join(__dirname, '..', 'images');

const FILES = [
    'hero-trucks.jpg',
    'about-autopark.jpg',
    'contacts-containers.jpg',
    'service-truck.jpg',
    'service-container.jpg',
    'service-refrigerated.jpg',
    'warehouse.jpg',
];

fs.mkdirSync(DEST, { recursive: true });

for (const name of FILES) {
    const from = path.join(SRC, name);
    const to = path.join(DEST, name);
    if (!fs.existsSync(from)) {
        console.error('Missing source:', from);
        process.exitCode = 1;
        continue;
    }
    fs.copyFileSync(from, to);
    console.log('Copied', name, '->', to, fs.statSync(to).size, 'bytes');
}
