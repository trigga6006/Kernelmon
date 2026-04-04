// TCP networking — host/join for spec exchange
const net = require('net');
const { colors } = require('./palette');

const PORT = 7331;
const PROTOCOL_VERSION = 1;

// Host: listen for incoming connections, exchange specs
function host(myFighter, port = PORT) {
  return new Promise((resolve, reject) => {
    const server = net.createServer((socket) => {
      console.log(`\x1b[38;2;130;220;235m  ◆ Opponent connected from ${socket.remoteAddress}\x1b[0m`);

      let data = '';
      socket.on('data', (chunk) => {
        data += chunk.toString();
        // Protocol: JSON lines separated by \n
        const lines = data.split('\n');
        if (lines.length >= 2) {
          try {
            const msg = JSON.parse(lines[0]);
            if (msg.type === 'hello' && msg.version === PROTOCOL_VERSION) {
              const opponentFighter = msg.fighter;

              // Send our fighter data back
              socket.write(JSON.stringify({
                type: 'hello',
                version: PROTOCOL_VERSION,
                fighter: myFighter,
              }) + '\n');

              // Small delay for the response to flush
              setTimeout(() => {
                socket.end();
                server.close();
                resolve({ opponent: opponentFighter, isHost: true });
              }, 200);
            }
          } catch (err) {
            reject(new Error('Invalid data from opponent'));
          }
        }
      });

      socket.on('error', (err) => {
        console.error('Connection error:', err.message);
        reject(err);
      });
    });

    server.listen(port, '0.0.0.0', () => {
      const addr = server.address();
      console.log('');
      console.log('\x1b[38;2;130;220;235m  ╭─────────────────────────────────────╮\x1b[0m');
      console.log('\x1b[38;2;130;220;235m  │   KERNELMON — Waiting...              │\x1b[0m');
      console.log('\x1b[38;2;130;220;235m  │                                     │\x1b[0m');
      console.log(`\x1b[38;2;130;220;235m  │   Port: \x1b[1m${addr.port}\x1b[22m                         │\x1b[0m`);
      console.log('\x1b[38;2;130;220;235m  │                                     │\x1b[0m');
      console.log('\x1b[38;2;100;100;130m  │   Share your IP with your opponent:  │\x1b[0m');
      console.log('\x1b[38;2;100;100;130m  │   kmon join <your-ip>                │\x1b[0m');
      console.log('\x1b[38;2;130;220;235m  ╰─────────────────────────────────────╯\x1b[0m');
      console.log('');
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${port} is already in use. Try: kmon host --port ${port + 1}`));
      } else {
        reject(err);
      }
    });
  });
}

// Join: connect to a host, exchange specs
function join(myFighter, hostAddr, port = PORT) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();

    console.log(`\x1b[38;2;180;160;240m  ◆ Connecting to ${hostAddr}:${port}...\x1b[0m`);

    socket.connect(port, hostAddr, () => {
      console.log('\x1b[38;2;180;160;240m  ◆ Connected! Exchanging specs...\x1b[0m');

      // Send our fighter data
      socket.write(JSON.stringify({
        type: 'hello',
        version: PROTOCOL_VERSION,
        fighter: myFighter,
      }) + '\n');
    });

    let data = '';
    socket.on('data', (chunk) => {
      data += chunk.toString();
      const lines = data.split('\n');
      if (lines.length >= 2) {
        try {
          const msg = JSON.parse(lines[0]);
          if (msg.type === 'hello' && msg.version === PROTOCOL_VERSION) {
            socket.end();
            resolve({ opponent: msg.fighter, isHost: false });
          }
        } catch (err) {
          reject(new Error('Invalid data from host'));
        }
      }
    });

    socket.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        reject(new Error(`Connection refused at ${hostAddr}:${port}. Is the host running?`));
      } else {
        reject(err);
      }
    });

    socket.setTimeout(10000, () => {
      socket.destroy();
      reject(new Error('Connection timed out after 10 seconds'));
    });
  });
}

module.exports = { host, join, PORT };
