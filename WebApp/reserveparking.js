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

// Define hex values and configuration for each port
const portConfigs = {
    5000: { hexValues: [0x01, 0x02, 0x03], currentIndex: 0, spots: ['Spot1', 'Spot2', 'Spot3'], sentReservations: {} },
    5001: { hexValues: [0x04, 0x05, 0x06], currentIndex: 0, spots: ['Spot4', 'Spot5', 'Spot6'], sentReservations: {} },
};

// Reserved hex values for each spot
const reservedHexValues = {
    Spot1: 0x0C,
    Spot2: 0x16,
    Spot3: 0x20,
    Spot4: 0x2A,
    Spot5: 0x34,
    Spot6: 0x3E
};

// Uneserve hex values for each spot
const unreserveHexValues = {
    Spot1: 0x0D,
    Spot2: 0x17,
    Spot3: 0x21,
    Spot4: 0x2B,
    Spot5: 0x35,
    Spot6: 0x3F
};

// Mapping of integer values to parking status
const statusMapping = {
    10: 'Available', 11: 'Unavailable',
    20: 'Available', 21: 'Unavailable',
    30: 'Available', 31: 'Unavailable',
    40: 'Available', 41: 'Unavailable',
    50: 'Available', 51: 'Unavailable',
    60: 'Available', 61: 'Unavailable'
};

// Cache to store reservation statuses
const reservationCache = {};

// Function to check reservation status with caching
const checkReservationStatus = async (currentSpot) => {
    if (reservationCache[currentSpot]) {
        return reservationCache[currentSpot];
    }

    const snapshot = await parkingRef.child(currentSpot).once('value');
    const isReserved = snapshot.val() === 'Reserved';
    reservationCache[currentSpot] = isReserved; // Cache the result
    return isReserved;
};

// Function to send the next hex value
const sendNextHexValue = async (socket, port) => {
    const config = portConfigs[port];
    const currentSpot = config.spots[config.currentIndex % config.spots.length];

    try {
        const isReserved = await checkReservationStatus(currentSpot);
        const hexValue = isReserved ? reservedHexValues[currentSpot] : config.hexValues[config.currentIndex];

        // Send the hex value only if it's not already sent for a reserved spot
        if (isReserved && !config.sentReservations[currentSpot]) {
            const buffer = Buffer.from([hexValue]);
            socket.write(buffer);
            console.log(`Port ${port} - Sent hex value: 0x${hexValue.toString(16).toUpperCase()} for ${currentSpot}`);

            // Mark the reservation value as sent
            config.sentReservations[currentSpot] = true;
        } else {//if (!isReserved) {
            const buffer = Buffer.from([config.hexValues[config.currentIndex]]);
            socket.write(buffer);
            console.log(`Port ${port} - Sent hex value: 0x${config.hexValues[config.currentIndex].toString(16).toUpperCase()} for ${currentSpot}`);
        }

        // Move to the next index
        config.currentIndex = (config.currentIndex + 1) % config.hexValues.length;
    } catch (error) {
        console.error('Error checking reservation status:', error);
    }
};

// Function to update parking status based on the received hex value
const updateParkingStatus = async (intValue) => {
    const status = statusMapping[intValue];
    if (!status) {
        console.log('Received an unknown value:', intValue);
        return;
    }

    const spotToUpdate = `Spot${intValue / 10 | 0}`; // Determine the spot based on intValue
    const parkingStatus = { [spotToUpdate]: status };

    // Update the parking status in Firebase
    try {
        await parkingRef.update(parkingStatus);
        console.log('Parking status updated in Firebase:', parkingStatus);
    } catch (error) {
        console.error('Error updating Firebase:', error);
    }
};

// Create a server for each port
const createServer = (port) => {
    const server = net.createServer((socket) => {
        console.log(`Client connected on port ${port}.`);

        // Continuously send hex values at intervals
        const interval = setInterval(() => {
            sendNextHexValue(socket, port);
        }, 1000); // Adjust the interval as needed

        socket.on('data', async (data) => {
			const config = portConfigs[port];
			const currentSpot = config.spots[config.currentIndex % config.spots.length];
            let intValue = parseInt(data.toString('hex'), 16);
            console.log(`Port ${port} - Received data: ${data.toString('hex')} - Converted to int: ${intValue}`);
            
            if(intValue==13){
				intValue=10;
				config.sentReservations[currentSpot] = false;
			}else if(intValue==23){
				intValue=20;
				config.sentReservations[currentSpot] = false;
			}else if(intValue==33){
				intValue=30;
				config.sentReservations[currentSpot] = false;
			}

            // Update parking status based on the received value
            await updateParkingStatus(intValue);
        });

        socket.on('error', (err) => {
            console.error(`Socket error on port ${port}:`, err);
        });

        socket.on('end', () => {
            console.log(`Client disconnected from port ${port}.`);
            clearInterval(interval); // Stop sending hex values if the client disconnects
        });
    });

    server.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });
};

// Create servers for all defined ports
Object.keys(portConfigs).forEach(createServer);
