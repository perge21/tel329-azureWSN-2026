# TEL329 - Tarea 4 - Actividad 4 : sensor "websense" (servidor HTTP en el mote)
CONTIKI_PROJECT = websense-cloud
all: $(CONTIKI_PROJECT)

CONTIKI = ../..

# httpd-simple.c: servidor HTTP minimo (copiado de rpl-border-router/webserver)
PROJECT_SOURCEFILES += httpd-simple.c

# Sensor dentro de la red RPL Lite
MAKE_ROUTING = MAKE_ROUTING_RPL_LITE

include $(CONTIKI)/Makefile.include
