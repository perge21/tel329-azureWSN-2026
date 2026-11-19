#ifndef PROJECT_CONF_H_
#define PROJECT_CONF_H_

/* El servidor HTTP necesita TCP (desactivado por defecto en Contiki-NG) */
#define UIP_CONF_TCP 1

/* Conexiones simultaneas que atiende httpd-simple.c */
#define WEBSERVER_CONF_CFS_CONNS 2

#endif /* PROJECT_CONF_H_ */
