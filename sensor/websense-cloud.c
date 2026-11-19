/*
 * TEL329 - Tarea 4 - Actividad 4
 * Sensor "websense": mote Contiki-NG que se une al DODAG RPL Lite y ejecuta un
 * servidor HTTP (puerto 80). Ante cada GET responde un JSON con temperatura y
 * humedad aleatorias:  {"temp":27,"hum":85}
 *
 * Adaptacion del Paso 2 del enunciado (Kurniawan, 2018): el servidor
 * httpd-simple.c es el mismo que usa el rpl-border-router de Contiki-NG.
 */
#include <stdio.h>
#include <string.h>
#include "contiki.h"
#include "contiki-net.h"
#include "net/routing/routing.h"
#include "lib/random.h"
#include "sys/node-id.h"
#include "sys/log.h"
#include "httpd-simple.h"

#define LOG_MODULE "Websense"
#define LOG_LEVEL  LOG_LEVEL_INFO

PROCESS(websense_process, "Websense: servidor HTTP del sensor");
AUTOSTART_PROCESSES(&websense_process);

/*---------------------------------------------------------------------------*/
/* Se ejecuta por cada peticion GET: construye y envia el JSON del sensor.
 * Las variables son static porque un protothread no conserva locales
 * despues de un PSOCK_SEND. */
static
PT_THREAD(generate_json(struct httpd_state *s))
{
  static char buff[40];
  static int temperature;
  static int humidity;

  PSOCK_BEGIN(&s->sout);

  temperature = 15 + (random_rand() % 25);  /* 15..39 C  */
  humidity = 80 + (random_rand() % 10);     /* 80..89 %  */
  snprintf(buff, sizeof(buff), "{\"temp\":%d,\"hum\":%d}",
           temperature, humidity);

  LOG_INFO("send json to requester: %s\n", buff);
  SEND_STRING(&s->sout, buff);

  PSOCK_END(&s->sout);
}
/*---------------------------------------------------------------------------*/
/* El servidor responde igual a cualquier ruta (/, /index.html, ...) */
httpd_simple_script_t
httpd_simple_get_script(const char *name)
{
  return generate_json;
}
/*---------------------------------------------------------------------------*/
PROCESS_THREAD(websense_process, ev, data)
{
  PROCESS_BEGIN();

  /* Desfasa la secuencia aleatoria segun el ID del nodo */
  {
    uint16_t i;
    for(i = 0; i < node_id; i++) {
      random_rand();
    }
  }

  httpd_init();
  LOG_INFO("Sensor websense listo: HTTP en el puerto 80\n");

  while(1) {
    PROCESS_WAIT_EVENT_UNTIL(ev == tcpip_event);
    httpd_appcall(data);
  }

  PROCESS_END();
}
/*---------------------------------------------------------------------------*/
