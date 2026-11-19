'use strict';
/*
 * TEL329 - Tarea 4 - Actividad 4 : Interfaz "middleware"
 * Cada POLL_MS ms pide por HTTP el JSON al mote (websense) y lo reenvia como
 * mensaje device-to-cloud a Azure IoT Hub (MQTT).
 *
 * Adaptado del Paso 4 del enunciado (Kurniawan, 2018). Cambios: libreria
 * "request" (obsoleta) -> fetch nativo de Node >= 18; typos corregidos;
 * credenciales por variables de entorno (.env) en vez de ir en el codigo.
 *
 * DRY_RUN=1 permite probar la lectura del sensor sin enviar nada a Azure.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const { Client, Message } = require('azure-iot-device');
const { Mqtt } = require('azure-iot-device-mqtt');

const connectionString = process.env.DEVICE_CONNECTION_STRING;
const sensorUrl = process.env.SENSOR_URL || 'http://[fd00::202:2:2:2]/';
const pollMs = Number(process.env.POLL_MS) || 3000;
const deviceId = process.env.DEVICE_ID || 'contiki-ng-01';
const port = Number(process.env.PORT) || 3000;
const dryRun = process.env.DRY_RUN === '1';

if (!dryRun && !connectionString) {
  console.error('Falta DEVICE_CONNECTION_STRING en .env (o use DRY_RUN=1).');
  process.exit(1);
}

/* --- Pagina de estado (equivalente al app.get('/') del enunciado) --- */
const app = express();
let lastReading = null;
app.get('/', (req, res) => res.send('Websense Azure Cloud'));
app.get('/last', (req, res) => res.json(lastReading || {}));
app.listen(port, () => {
  console.log(`listening on *:${port}`);
  console.log('websense azure Cloud was started');
});

/* --- Lectura del sensor y envio a la nube --- */
async function readSensor() {
  const res = await fetch(sensorUrl, { signal: AbortSignal.timeout(2500) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return JSON.parse(await res.text());
}

function buildMessage(obj) {
  const temperature = obj.temp;
  const humidity = obj.hum;
  const data = JSON.stringify({ deviceId, temperature, humidity });
  const message = new Message(data);
  message.contentType = 'application/json';
  message.contentEncoding = 'utf-8';
  message.properties.add('temperatureAlert', temperature > 30 ? 'true' : 'false');
  return message;
}

async function tick(client) {
  try {
    const obj = await readSensor();
    console.log(obj);
    lastReading = { ...obj, at: new Date().toISOString() };
    const message = buildMessage(obj);
    console.log('Sending message: ' + message.getData());
    if (!dryRun) {
      await client.sendEvent(message);
      console.log('send status: MessageEnqueued');
    }
  } catch (err) {
    console.log('Error: ' + err.message);
  }
}

function loop(client) {
  tick(client).finally(() => setTimeout(() => loop(client), pollMs));
}

async function main() {
  if (dryRun) {
    console.log('DRY_RUN=1: no se envia nada a Azure');
    return loop(null);
  }
  const client = Client.fromConnectionString(connectionString, Mqtt);
  client.on('error', (err) => console.error('Client error: ' + err.message));
  try {
    await client.open();
  } catch (err) {
    console.error('Could not connect: ' + err.message);
    process.exit(1);
  }
  console.log('Client connected');
  loop(client);
}

main();
console.log('Contiki-NG Azure Middleware started.');
