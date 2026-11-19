'use strict';
/*
 * TEL329 - Tarea 4 - Actividad 4 : Suscriptor de Azure IoT Hub
 * Lee, desde el endpoint integrado (compatible con Event Hubs) del IoT Hub,
 * los mensajes que envia el middleware, y los muestra por consola.
 *
 * Adaptado de los Pasos 6-7 del enunciado: el paquete "azure-event-hubs"
 * esta obsoleto, se usa "@azure/event-hubs" v5. La conexion se arma con la
 * politica "service" del Hub (la clave del dispositivo solo sirve para enviar).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { EventHubConsumerClient, latestEventPosition } = require('@azure/event-hubs');

const iotHubConn = process.env.IOTHUB_SERVICE_CONNECTION_STRING;
const ehEndpoint = process.env.EVENTHUB_ENDPOINT;
const ehName = process.env.EVENTHUB_NAME;

if (!iotHubConn || !ehEndpoint || !ehName) {
  console.error('Faltan IOTHUB_SERVICE_CONNECTION_STRING, EVENTHUB_ENDPOINT o EVENTHUB_NAME en .env');
  process.exit(1);
}

/* Extrae SharedAccessKeyName / SharedAccessKey de la connection string del Hub */
const parts = Object.fromEntries(
  iotHubConn.split(';').filter(Boolean).map((kv) => {
    const i = kv.indexOf('=');
    return [kv.slice(0, i), kv.slice(i + 1)];
  })
);
if (!parts.SharedAccessKeyName || !parts.SharedAccessKey) {
  console.error('La connection string debe ser la de una politica de acceso (ej. "service").');
  process.exit(1);
}

const connectionString =
  `Endpoint=${ehEndpoint};SharedAccessKeyName=${parts.SharedAccessKeyName};` +
  `SharedAccessKey=${parts.SharedAccessKey};EntityPath=${ehName}`;

// El puerto AMQP 5671 suele estar bloqueado en redes/VM: se usa AMQP sobre WebSockets (443)
const WebSocket = require('ws');
const client = new EventHubConsumerClient('$Default', connectionString, {
  webSocketOptions: { webSocket: WebSocket, webSocketConstructorOptions: {} },
});

const subscription = client.subscribe(
  {
    processEvents: async (events, context) => {
      for (const ev of events) {
        const device = ev.systemProperties && ev.systemProperties['iothub-connection-device-id'];
        console.log('Message received:');
        console.log(JSON.stringify(ev.body));
        if (device) console.log(`  (dispositivo: ${device}, particion: ${context.partitionId})`);
        console.log('');
      }
    },
    processError: async (err, context) => {
      console.log("Error:", err.name, err.code, err.message, err);
    },
    processInitialize: async (context) => {
      console.log('Created partition receiver: ' + context.partitionId);
    },
  },
  { startPosition: latestEventPosition } /* solo mensajes nuevos (equivale a startAfterTime: Date.now()) */
);

process.on('SIGINT', async () => {
  await subscription.close();
  await client.close();
  process.exit(0);
});
