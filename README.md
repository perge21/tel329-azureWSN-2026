# TEL329 – Tarea 4 – Actividad 4: Sensor Contiki-NG → Azure IoT Hub

Un mote Contiki-NG (RPL Lite) sirve por HTTP una lectura de temperatura y humedad. Un *middleware* en Node.js la consulta y la reenvía a **Azure IoT Hub**, y un suscriptor la lee desde el endpoint integrado del Hub.

```
Sensor (mote 2)  --HTTP/RPL-->  Border router (mote 1)  --tunslip6-->  Middleware (Node.js)
                                                                              |  MQTT/TLS
                                    Suscriptor (Node.js)  <--Event Hubs--  Azure IoT Hub
```

Basado en el código de Kurniawan (2018), *Practical Contiki-NG*, con correcciones (ver abajo).

## Estructura

| Ruta | Contenido |
|---|---|
| `sensor/` | `websense-cloud.c` (servidor HTTP del mote), `httpd-simple.c/.h` (de `rpl-border-router/webserver`, tipo de contenido cambiado a JSON), `project-conf.h`, `Makefile` |
| `middleware/middleware-azure.js` | Consulta al sensor y envía a Azure IoT Hub (MQTT) |
| `subscriber/azure-sensor-subscriber.js` | Lee los mensajes del endpoint compatible con Event Hubs |
| `cooja/act4.csc` | Simulación de Cooja (border router + sensor + Serial Socket en el puerto 60001) |
| `.env.example` | Variables de entorno (copiar a `.env`; **no se sube a Git**) |

## Requisitos

- Contiki-NG con Cooja y `tunslip6` (compilar con `make -C tools/serial-io tunslip6`), Java 17.
- Node.js ≥ 22 (`nvm install 22`).
- Un IoT Hub (tier Free sirve) con un dispositivo `contiki-ng-01` (clave simétrica).

## Configuración de Azure

1. Crear el IoT Hub y registrar el dispositivo `contiki-ng-01`. Copiar su **Primary connection string**.
2. En *Hub settings → Built-in endpoints* anotar el **Event Hub-compatible name** y el **endpoint**.
3. En *Security settings → Shared access policies → service* copiar la **Connection string–primary key**.
4. Copiar `.env.example` a `.env` y completar `DEVICE_CONNECTION_STRING` e `IOTHUB_SERVICE_CONNECTION_STRING`.

## Ejecución

1. Copiar `sensor/` a `~/contiki-ng/examples/tel329-azure/` (la ruta de Contiki-NG puede variar, p. ej. `~/Downloads/contiki-ng`).
2. Abrir `cooja/act4.csc` con `cd tools/cooja && ./gradlew run --args="$HOME/ruta/act4.csc"` (en `.csc` el comando es `make`, no `$(MAKE)`) y pulsar *Start/Pause*. Equivale a: mote 1 = `examples/rpl-border-router/border-router.c`, mote 2 = `examples/tel329-azure/websense-cloud.c` (tipo *Cooja mote*, dentro del alcance de radio). Activar *Serial Socket (SERVER)* en el mote 1 (puerto 60001) y dejar *Speed limit* en 1X.
3. Túnel y verificación del sensor:
   ```
   cd ~/contiki-ng/tools/serial-io
   sudo ./tunslip6 -a 127.0.0.1 -p 60001 fd00::1/64
   # si la red de la VM anuncia otro prefijo fd00::/64 (NAT de VirtualBox):
   #   sudo sysctl -w net.ipv6.conf.enp0s3.disable_ipv6=1
   ping -6 -c 4 fd00::202:2:2:2
   curl -g -6 "http://[fd00::202:2:2:2]/"      # -> {"temp":27,"hum":85}
   ```
4. En otra carpeta, con el repo clonado:
   ```
   npm install
   npm run subscriber      # terminal A: primero, solo lee mensajes nuevos
   npm run middleware      # terminal B
   ```
   Probar solo el sensor, sin Azure: `DRY_RUN=1 npm run middleware`.

## Salidas esperadas

- **Mote (4.b):** `send json to requester: {"temp":27,"hum":85}`
- **Middleware (4.a):** `{ temp: 27, hum: 85 }` y `Sending message: {"deviceId":"contiki-ng-01","temperature":27,"humidity":85}`
- **Suscriptor (4.c):** `Message received:` con el mismo JSON.

## Cambios respecto del código del enunciado

- Contiki-NG no incluye `http-simple.c`: se usa `httpd-simple.c` del border router, y se activa TCP (`UIP_CONF_TCP 1`).
- Corregido `int humidity = ... :` (debe terminar en `;`) y los typos `clientFrom-ConnectionString` y `mydecideId`.
- La librería `request` (obsoleta) se reemplaza por `fetch` de Node.
- `azure-event-hubs` (obsoleto) se reemplaza por `@azure/event-hubs` v5; el suscriptor usa la política `service`, porque la clave del dispositivo solo permite enviar.
- En redes que bloquean el puerto AMQP 5671 (error `ECONNREFUSED ...:5671`), el suscriptor usa AMQP sobre WebSockets (puerto 443) con el paquete `ws`.
- Credenciales por variables de entorno, no en el código.
