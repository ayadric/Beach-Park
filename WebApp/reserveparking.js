const net = require('net');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('/home/edward/Desktop/Senior Project/WebApp/parking-reservation-syst-631f1-firebase-adminsdk-h4sj1-90621b3a08.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://parking-reservation-syst-631f1-default-rtdb.firebaseio.com/'
});

// Reference to your database path for parking spots
const parkingRef = admin.database().ref('parkingSpots');

// Define hex values and currentIndex for each port
let portConfigs = {
    5000: { hexValues: [0x01, 0x02, 0x03], currentIndex: 0 },
    5001: { hexValues: [0x04, 0x05, 0x06], currentIndex: 0 },
};

// Function to send the next hex value
const sendNextHexValue = (socket, port) => {
    const config = portConfigs[port];
    if (config.currentIndex < config.hexValues.length) {
        const hexValue = config.hexValues[config.currentIndex];
        const buffer = Buffer.from([hexValue]);
        socket.write(buffer);
        console.log(`Port ${port} - Sent hex value: 0x${hexValue.toString(16).toUpperCase()}`);
        config.currentIndex++;
    } else {
        console.log(`Port ${port} - All hex values have been sent.`);
        // Reset currentIndex to start sending hex values again
        config.currentIndex = 0; // Reset index to allow repeating
        // Optionally send the first hex value again after resetting
        sendNextHexValue(socket, port); // Start again immediately after reset
    }
};

// Function to update parking status based on the received hex value
const updateParkingStatus = (intValue) => {
    let parkingStatus = {};

    // Check which parking spot the value corresponds to and whether it's available or not
    switch (intValue) {
        case 10:
            parkingStatus = { Spot1: 'Available' };
            break;
        case 11:
            parkingStatus = { Spot1: 'Unavailable' };
            break;
        case 20:
            parkingStatus = { Spot2: 'Available' };
            break;
        case 21:
            parkingStatus = { Spot2: 'Unavailable' };
            break;
        case 30:
            parkingStatus = { Spot3: 'Available' };
            break;
        case 31:
            parkingStatus = { Spot3: 'Unavailable' };
            break;
        case 40:
            parkingStatus = { Spot4: 'Available' };
            break;
        case 41:
            parkingStatus = { Spot4: 'Unavailable' };
            break;
        case 50:
            parkingStatus = { Spot5: 'Available' };
            break;
        case 51:
            parkingStatus = { Spot5: 'Unavailable' };
            break;
        case 60:
            parkingStatus = { Spot6: 'Available' };
            break;
        case 61:
            parkingStatus = { Spot6: 'Unavailable' };
            break;
        default:
            console.log('Received an unknown value:', intValue);
            return;
    }

    parkingRef.once('value').then((snapshot) => {
        if (!snapshot.exists()) {
            console.log('Creating parkingSpots path in Firebase.');
            return parkingRef.set({
                Spot1: 'available',
                Spot2: 'available',
                Spot3: 'available',
                Spot4: 'available',
                Spot5: 'available',
                Spot6: 'available'
            });
        }
    }).then(() => {
        return parkingRef.update(parkingStatus);
    }).then(() => {
        console.log('Parking status updated in Firebase:', parkingStatus);
    }).catch((error) => {
        console.error('Error updating Firebase:', error);
    });
};

// Create a server for each port
const createServer = (port) => {
    const server = net.createServer((socket) => {
        console.log(`Client connected on port ${port}.`);

        // Immediately send the first hex value after connection
        sendNextHexValue(socket, port);

        let waitingForData = false;

        // Handle data reception
        socket.on('data', (data) => {
            if (!waitingForData) {
                waitingForData = true; // Set the flag to true while we are handling data
                const hexString = data.toString('hex');
                const intValue = parseInt(hexString, 16);
                console.log(`Port ${port} - Received data: ${hexString}`);
                console.log(`Port ${port} - Converted to int: ${intValue}`);

                // Update parking status based on the received value
                updateParkingStatus(intValue);

                // After receiving data, send the next hex value
                sendNextHexValue(socket, port);
                waitingForData = false; // Reset the flag
            }
        });

        // Handle client disconnect
        socket.on('end', () => {
            console.log(`Client disconnected from port ${port}.`);
        });

        // Handle errors
        socket.on('error', (err) => {
            console.error(`Port ${port} - Socket error:`, err);
        });
    });

    // Start the server
    server.listen(port, '192.168.1.150', () => {
        console.log(`Server listening on port ${port}.`);
    });
};

// Create servers for each port
createServer(5000);
createServer(5001);
