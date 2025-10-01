# Assure-toi d'être bien sur l'image Playwright
FROM mcr.microsoft.com/playwright:v1.54.2-jammy

USER root

# APT silencieux + fuseau
ARG DEBIAN_FRONTEND=noninteractive
ENV TZ=Europe/Brussels

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      tzdata xvfb x11vnc fluxbox novnc websockify xterm x11-apps && \
    rm -rf /var/lib/apt/lists/* && \
    ln -fs /usr/share/zoneinfo/$TZ /etc/localtime && \
    dpkg-reconfigure -f noninteractive tzdata

# Pré-crée le socket X pour éviter l'erreur "euid != 0"
RUN mkdir -p /tmp/.X11-unix && chmod 1777 /tmp/.X11-unix

# (Optionnel) si jamais Dokploy build sur une image Node autre,
# garde ce filet de sécurité pour être sûr d'avoir le module:
RUN npm i -g playwright@1.54.2

ENV DISPLAY=:99
EXPOSE 5900 7900

COPY pw-headful-server.js /home/pwuser/pw-headful-server.js
COPY start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# Revenir à pwuser (nécessaire pour Chromium)
USER pwuser
WORKDIR /home/pwuser

CMD ["/usr/local/bin/start.sh"]