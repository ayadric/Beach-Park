const http = require('http');
const fs = require('fs');
const port = 3000;
const WebSocket = require('ws');

const server = http.createServer(function(req, res){
	if (req.url === '/'){
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(`
            <html>
            <head>
                <title>Parking Status</title>
                <script>
                    //Create WebSocket connection.
                    const ws = new WebSocket('ws://localhost:3000');
                    
                    ws.onmessage = function(event) {
                        document.getElementById('parking-status').innerText = event.data;
                    };
                </script>
            </head>
            <body>
                <h1>Parking Spot Status</h1>
                <p id="parking-status">Waiting for updates...</p>
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

//Watch the file for any new changes

fs.watch('/home/edward/Desktop/Senior Project/Data/Spot_One/parking_status.txt', (eventType, filename) => {
  console.log(`event type is: ${eventType}`);
  if(eventType === 'change'){
    try {
        const data = fs.readFileSync('/home/edward/Desktop/Senior Project/Data/Spot_One/parking_status.txt', 'utf8');
        console.log('Latest status:', data); // Log to terminal
        broadcast(data); //Broadcast to all clients
    } catch (error) {
        console.error('Error reading the file:', error.message); // Log the error message
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

            

