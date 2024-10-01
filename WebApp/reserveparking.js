const http = require('http');
const fs = require('fs');
const port = 3000;
const WebSocket = require('ws');

const server = http.createServer(function(req, res){
	if (req.url === '/'){
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Parking Status</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: teal;
            color: white;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }

        h1 {
            font-size: 3em;
            margin-bottom: 20px;
        }

        p {
            font-size: 1.5em;
            padding: 10px 20px;
            background-color: rgba(255, 255, 255, 0.2);
            border-radius: 10px;
        }

        .container {
            text-align: center;
            background-color: rgba(0, 0, 0, 0.3);
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }
    </style>
    <script>
        // Create WebSocket connection.
        const ws = new WebSocket('ws://localhost:3000');
        
        ws.onmessage = function(event) {
            document.getElementById('parking-status').innerText = event.data;
        };
    </script>
</head>
<body>
    <div class="container">
        <h1>Parking Spot Status</h1>
        <p id="parking-status">Waiting for updates...</p>
    </div>
</body>
</html>
        `);
        res.end();
	}

});

const wss = new WebSocket.Server({ server:server });

//A client WebSocket broadcasting to all connected WebSocket clients, including itself.
const broadcast = (data) => {
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });

};

fs.watch('/home/edward/Desktop/Senior Project/Data/Spot_One/parking_status.txt', (eventType, filename) => {
  console.log(`event type is: ${eventType}`);
  if(eventType === 'change'){
try {
    // Read the file and split it into lines
    const data = fs.readFileSync('/home/edward/Desktop/Senior Project/Data/Spot_One/parking_status.txt', 'utf8');
    const lines = data.split('\n');
    
    // Initialize an array to store the status messages
    const statusMessages = [];

    // Check each line according to your conditions
    if (lines[0]) {  // Check first line
        if (lines[0].includes('10')) {
            statusMessages.push('Spot 1 Available');
        } else if (lines[0].includes('11')) {
            statusMessages.push('Spot 1 Unavailable');
        }
    }

    if (lines[1]) {  // Check second line
        if (lines[1].includes('20')) {
            statusMessages.push('Spot 2 Available');
        } else if (lines[1].includes('21')) {
            statusMessages.push('Spot 2 Unavailable');
        }
    }

    if (lines[2]) {  // Check third line
        if (lines[2].includes('30')) {
            statusMessages.push('Spot 3 Available');
        } else if (lines[2].includes('31')) {
            statusMessages.push('Spot 3 Unavailable');
        }
    }

    // Concatenate the status messages
    const finalStatus = statusMessages.join(', ');

    // Broadcast the final status message
    broadcast(finalStatus);

} catch (error) {
    console.error('Error reading the file:', error.message);  // Log the error message
}
  }
}); 


server.listen(port, function(error){
   if (error){
    console.log('Something went wrong', error)
   }else {
    console.log('Server is listening on port ' + port)   

   }  
});

            
