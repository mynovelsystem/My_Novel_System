# Política de Privacidad — MyNovelSystem

**Última actualización:** 17 de octubre de 2026  
**Versión:** 4.0.0  
**Contacto:** mynovelsystem@gmail.com  

Esta Política de Privacidad describe de manera transparente, veraz y exhaustiva el tratamiento de datos personales y técnicos que realiza la extensión de navegador **MyNovelSystem**, conforme a los principios de minimización de datos del Reglamento General de Protección de Datos (RGPD / GDPR) y las directrices de la Chrome Web Store.

---

## 1. Responsable del Tratamiento y Contacto
El responsable del desarrollo y mantenimiento de la extensión es el desarrollador de MyNovelSystem. Para cualquier duda, consulta o ejercicio de derechos de privacidad, puede contactar a través del correo electrónico: **mynovelsystem@gmail.com**.

---

## 2. Ejecución en la Web y Tratamiento de Contenido (Permiso `<all_urls>`)
La extensión requiere ejecutarse en las páginas web visitadas para poder detectar automáticamente cuándo el usuario está leyendo un capítulo de una novela o cómic web.

- **Páginas que NO son novelas:** En sitios que no corresponden a plataformas de lectura o en páginas donde no se detectan patrones de capítulos, la extensión **NO almacena ningún dato, NO recopila información personal, NO rastrea la navegación y NO envía ninguna petición a servidores externos**. El análisis heurístico se realiza exclusivamente en la memoria volátil del navegador y se descarta de inmediato.
- **Lista Negra y Dominios Excluidos:** La extensión bloquea por diseño y por defecto la ejecución de cualquier observador en buscadores (Google, Bing, Yahoo), redes sociales (X, Facebook, Instagram, Reddit), servicios de streaming (YouTube, Twitch, Netflix), plataformas de desarrollo (GitHub, StackOverflow), almacenamiento y productividad. Asimismo, el usuario puede añadir cualquier dominio a su lista negra local para detener toda inspección con 0 consumo y 0 interferencia.

---

## 3. Tratamiento de Credenciales y Autenticación
La extensión **NUNCA almacena ni registra contraseñas** de los usuarios en su código ni en el almacenamiento local.

- Al iniciar sesión o registrarse para la sincronización en la nube, las credenciales se transmiten directamente y de forma segura a través de HTTPS a **Google Firebase Authentication (Identity Toolkit)**.
- La extensión almacena en `chrome.storage.local` únicamente el identificador único de usuario (`uid`), el correo electrónico y los tokens de sesión delegados (`idToken` y `refreshToken`) necesarios para autorizar las solicitudes a la base de datos de usuario.

---

## 4. Datos Almacenados Localmente (en su Dispositivo)
La extensión guarda en el almacenamiento local de su navegador (`chrome.storage.local`):

- **Biblioteca de lectura:** Título de la obra, último capítulo leído, porcentaje de scroll vertical, fecha de actualización, URL del capítulo y estado manual (leyendo, pausada, completada, etc.).
- **Progreso de cultivo y logros:** Capítulos leídos acumulados, Qi obtenido, logros desbloqueados, recompensas reclamadas y logro equipado.
- **Preferencias del usuario:** Idioma activo (Español o Inglés), umbrales de días para estados inactivos, modo de rendimiento y lista de dominios bloqueados.
- **Configuración de WhatsApp (CallMeBot):** Teléfono y API Key de CallMeBot. **Estos datos se conservan EXCLUSIVAMENTE en el almacenamiento local del dispositivo** y nunca se envían ni se sincronizan con Firebase.

---

## 5. Datos Enviados a Servicios de Terceros
La extensión realiza comunicaciones externas únicamente con los siguientes dos servicios y bajo las siguientes condiciones:

### A. Google Firebase (Servicio de Nube — Opcional)
Solo si el usuario decide voluntariamente registrarse o iniciar sesión con una cuenta para la sincronización entre dispositivos:
- **Datos enviados:** Dirección de correo electrónico del usuario, copia de la biblioteca de novelas (título, capítulo, enlace, progreso), estadísticas de lectura (Qi, logros desbloqueados) y lista negra de dominios.
- **Servidor de destino:** Firebase Realtime Database (`https://novel-tracker-1d134-default-rtdb.firebaseio.com`) y Google Identity Toolkit sobre HTTPS cifrado.

### B. CallMeBot (Avisos de WhatsApp — Opcional)
Solo si el usuario activa conscientemente las notificaciones de WhatsApp en los ajustes e introduce su teléfono y API Key:
- **Datos enviados:** Número de teléfono (saneado a dígitos exclusivamente), API Key personal de CallMeBot, título de la novela pausada y URL de reanudación de lectura.
- **Servidor de destino:** `https://api.callmebot.com/whatsapp.php` mediante petición GET sobre HTTPS cifrado al cumplirse el temporizador de pausa o al pulsar "Probar".

---

## 6. Finalidad del Tratamiento y Conservación
- **Finalidad:** Permitir al usuario continuar la lectura exactamente donde la dejó, registrar sus estadísticas personales de progreso lúdico y recibir recordatorios opcionales en su propio WhatsApp.
- **Conservación:** Los datos locales persisten hasta que el usuario borra la extensión o limpia los datos del navegador. Los datos en la nube persisten mientras la cuenta permanezca activa.

---

## 7. Política de No Venta de Datos y Cero Publicidad
MyNovelSystem está diseñado bajo un modelo estricto de privacidad y utilidad para el lector:
- **No venta ni cesión comercial:** La extensión **NO vende, NO alquila, NO comercializa ni transfiere** ningún dato personal, de navegación o de lectura a terceros, empresas de publicidad ni intermediarios de datos.
- **Sin publicidad ni rastreadores de anuncios:** La extensión no contiene librerías de publicidad, anuncios de terceros, ni redes o píxeles de seguimiento publicitario de ningún tipo.
- **Uso limitado y exclusivo:** Cualquier comunicación de red se limita exclusivamente a las funcionalidades solicitadas voluntariamente por el usuario (sincronización con Google Firebase, alertas de CallMeBot o envío de reportes de diagnóstico).

---

## 8. Derechos del Usuario (RGPD) y Eliminación de Datos
Como usuario, le asisten los derechos de acceso, rectificación, portabilidad y supresión de sus datos:
- **Exportación y portabilidad:** Puede exportar en cualquier momento toda su biblioteca y estadísticas en formato JSON desde el apartado «Copia de Seguridad» de los ajustes.
- **Eliminación de cuenta desde la propia extensión:** Si utiliza sincronización en la nube, la extensión dispone de una opción directa e integrada para eliminar su cuenta en la ventana de Cuenta («Eliminar cuenta»). Al confirmar esta acción:
  - Se elimina de inmediato su cuenta de autenticación en **Google Firebase Authentication**.
  - Se suprimen íntegramente sus datos de biblioteca, estadísticas y configuraciones almacenados en **Firebase Realtime Database** (`/users/<uid>`).
  - Se purgan de forma definitiva todos los registros locales de bóveda y avatares asociados a dicha cuenta en el almacenamiento de su navegador, revirtiendo la extensión a modo local.
  - *Reautenticación por seguridad:* Si la sesión de autenticación requiere confirmación reciente, el sistema le solicitará iniciar sesión nuevamente antes de proceder con el borrado definitivo.
- **Eliminación local:** Al desinstalar la extensión o limpiar los datos del navegador, toda la información local se elimina permanentemente.
- **Solicitud por correo electrónico:** Alternativamente, puede solicitar el borrado manual de su cuenta y sus datos en Firebase enviando un mensaje a `mynovelsystem@gmail.com` indicando el correo de su cuenta.

---

## 9. Reportes de Errores y Diagnóstico Técnico
La extensión incluye una funcionalidad opcional para enviar reportes de errores técnicos al desarrollador con el fin de resolver fallos o incompatibilidades en sitios web de lectura:
- **Carácter voluntario y anónimo por defecto:** El envío de un reporte solo ocurre cuando el usuario pulsa deliberadamente el botón «Enviar reporte». Por defecto, todos los reportes son completamente **anónimos** (se identifican como `anonymous`) y no transmiten el correo de la cuenta del usuario ni información personal identificable.
- **Consentimiento específico e independiente para el correo:** La casilla «Incluir mi correo de contacto» se encuentra desmarcada por defecto. Solo si el usuario decide activarla conscientemente, se adjuntará el correo de su cuenta para recibir respuesta del desarrollador.
- **Datos técnicos y URL de pestaña (opcional y desmarcado por defecto):** La casilla «Adjuntar URL actual y registro técnico (logs)» se encuentra desmarcada por defecto. La URL y título de la pestaña activa, así como los eventos técnicos recientes de depuración, **solo se incluyen si el usuario marca deliberadamente dicha casilla**. Si no se marca, no se envía ninguna URL ni registro de logs (valor nulo).
- **Transparencia previa:** El usuario puede revisar previamente estos registros mediante el visor desplegable antes de enviarlos.
- **Privacidad y minimización:** Los reportes técnicos se transmiten de forma segura a Firebase Realtime Database bajo la ruta `/reports/` para uso exclusivo de diagnóstico técnico por el desarrollador.
- **Contacto directo:** Para cualquier cuestión relativa a un reporte de error o para solicitar la supresión de cualquier dato enviado, puede contactar directamente a: `mynovelsystem@gmail.com`.
