"""Validate a renewed certificate, install it, and roll back a failed nginx reload."""
import argparse
import hashlib
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

DOMAINS = ('242424.art', 'www.242424.art')
TARGET = Path('/etc/nginx/ssl/242424.art')


def run(*args):
    result = subprocess.run(args, check=True, capture_output=True)
    return result.stdout


def validate_certificate(cert, key, ca_file=None):
    run('openssl', 'x509', '-in', str(cert), '-noout', '-checkend', str(14 * 86400))
    verify_args = ['openssl', 'verify', '-purpose', 'sslserver', '-untrusted', str(cert)]
    if ca_file:
        verify_args += ['-CAfile', str(ca_file)]
    for domain in DOMAINS:
        run(*verify_args, '-verify_hostname', domain, str(cert))
    cert_pub = run('openssl', 'x509', '-in', str(cert), '-pubkey', '-noout')
    key_pub = run('openssl', 'pkey', '-in', str(key), '-pubout')
    if cert_pub != key_pub:
        raise ValueError('Certificate and private key do not match')


def replace_file(source, destination, mode):
    temporary = destination.with_name(destination.name + '.new')
    try:
        shutil.copyfile(source, temporary)
        temporary.chmod(mode)
        os.replace(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)


def deploy(cert, key):
    validate_certificate(cert, key)
    TARGET.mkdir(mode=0o700, parents=True, exist_ok=True)
    installed = TARGET / 'fullchain.pem'
    installed_key = TARGET / 'privkey.pem'
    if (installed.is_file() and installed_key.is_file()
            and installed.read_bytes() == cert.read_bytes()
            and installed_key.read_bytes() == key.read_bytes()):
        print('CERTIFICATE_UNCHANGED')
        return
    with tempfile.TemporaryDirectory(prefix='.certificate-backup-', dir=TARGET.parent) as directory:
        backup = Path(directory)
        for path in (installed, installed_key):
            if path.exists():
                shutil.copyfile(path, backup / path.name)
        try:
            replace_file(cert, installed, 0o644)
            replace_file(key, installed_key, 0o600)
            run('/usr/sbin/nginx', '-t')
            run('/usr/bin/systemctl', 'reload', 'nginx')
        except Exception:
            for path, mode in ((installed, 0o644), (installed_key, 0o600)):
                previous = backup / path.name
                if previous.exists():
                    replace_file(previous, path, mode)
                else:
                    path.unlink(missing_ok=True)
            run('/usr/sbin/nginx', '-t')
            run('/usr/bin/systemctl', 'reload', 'nginx')
            raise
    print('CERTIFICATE_DEPLOYED_SHA256', hashlib.sha256(cert.read_bytes()).hexdigest())


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('certificate', type=Path)
    parser.add_argument('private_key', type=Path)
    parser.add_argument('--check-only', action='store_true')
    args = parser.parse_args()
    if args.check_only:
        validate_certificate(args.certificate, args.private_key)
        print('CERTIFICATE_VALID')
    else:
        deploy(args.certificate, args.private_key)
