#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

[[ $(id -u) == 0 ]] || { echo 'Run as root'; exit 1; }
[[ $(hostname -s) == srv2044594 ]] || { echo 'Unexpected target host'; exit 1; }
client_ip=${SSH_CONNECTION%% *}
python3 -c 'import ipaddress,sys; ipaddress.ip_address(sys.argv[1])' "$client_ip"
grep -q ' codex-laptop-kws-vps$' /root/.ssh/authorized_keys

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get -y -o Dpkg::Options::=--force-confold upgrade
apt-get install -y ca-certificates curl git jq openssl ufw fail2ban rsync rclone age python3 postgresql-client

id kws-admin >/dev/null 2>&1 || useradd --create-home --shell /bin/bash kws-admin
install -d -m 700 -o kws-admin -g kws-admin /home/kws-admin/.ssh
grep ' codex-laptop-kws-vps$' /root/.ssh/authorized_keys > /home/kws-admin/.ssh/authorized_keys
chown kws-admin:kws-admin /home/kws-admin/.ssh/authorized_keys
chmod 600 /home/kws-admin/.ssh/authorized_keys
printf '%s\n' 'kws-admin ALL=(ALL) NOPASSWD: ALL' > /etc/sudoers.d/kws-admin
chmod 440 /etc/sudoers.d/kws-admin
visudo -cf /etc/sudoers.d/kws-admin

install -d -m 700 /root/kws-bootstrap-previous
if [[ ! -e /root/kws-bootstrap-previous/sshd-config.tar ]]; then
  tar -cf /root/kws-bootstrap-previous/sshd-config.tar /etc/ssh/sshd_config /etc/ssh/sshd_config.d
fi
cat > /etc/ssh/sshd_config.d/00-kws-security.conf <<'EOF'
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
X11Forwarding no
MaxAuthTries 3
EOF
sshd -t
systemctl reload ssh

ufw default deny incoming
ufw default allow outgoing
ufw allow from "$client_ip" to any port 22 proto tcp comment 'KWS administrator current device'
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
systemctl enable --now fail2ban

install -d -m 700 /opt/kws /opt/kws/config /opt/kws/supabase /opt/kws/video /var/backups/kws /var/backups/kws/migration
install -d -m 755 /opt/kws/web /opt/kws/web/releases
install -d -m 755 /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
. /etc/os-release
arch=$(dpkg --print-architecture)
cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${UBUNTU_CODENAME:-$VERSION_CODENAME}
Components: stable
Architectures: $arch
Signed-By: /etc/apt/keyrings/docker.asc
EOF
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
if [[ ! -e /etc/docker/daemon.json ]]; then
  cat > /etc/docker/daemon.json <<'EOF'
{"log-driver":"local","log-opts":{"max-size":"10m","max-file":"3"},"live-restore":true}
EOF
  systemctl restart docker
fi
systemctl enable docker
docker version --format '{{.Server.Version}}'
docker compose version
ufw status
sshd -T | awk '/^(permitrootlogin|passwordauthentication|pubkeyauthentication|kbdinteractiveauthentication) /'
[[ ! -e /var/run/reboot-required ]] || echo 'REBOOT_REQUIRED'
echo 'BOOTSTRAP_COMPLETE_ADMIN_LOGIN_MUST_BE_VERIFIED'
