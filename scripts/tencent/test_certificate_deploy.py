"""Exercise real OpenSSL validation and a failed nginx reload without touching live TLS."""
import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('certificate_deploy', Path(__file__).with_name('deploy-certificate.py'))
deploy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)


class CertificateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = tempfile.TemporaryDirectory()
        cls.root = Path(cls.temporary.name)
        cls.ca = cls.root / 'ca.pem'
        cls.ca_key = cls.root / 'ca.key'
        cls.command('openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
                    '-keyout', str(cls.ca_key), '-out', str(cls.ca), '-days', '60', '-subj', '/CN=Renewal test CA')
        cls.key = cls.root / 'leaf.key'
        request = cls.root / 'leaf.csr'
        cls.command('openssl', 'req', '-new', '-newkey', 'rsa:2048', '-nodes',
                    '-keyout', str(cls.key), '-out', str(request), '-subj', '/CN=242424.art')
        for name, days, domains in [('valid', 30, '242424.art,DNS:www.242424.art'),
                                    ('wrong-host', 30, 'other.example'),
                                    ('expires-soon', 1, '242424.art,DNS:www.242424.art')]:
            extension = cls.root / (name + '.ext')
            extension.write_text('subjectAltName=DNS:' + domains + '\nextendedKeyUsage=serverAuth\n')
            cls.command('openssl', 'x509', '-req', '-in', str(request), '-CA', str(cls.ca),
                        '-CAkey', str(cls.ca_key), '-CAcreateserial', '-out', str(cls.root / (name + '.pem')),
                        '-days', str(days), '-extfile', str(extension))

    @staticmethod
    def command(*args):
        subprocess.run(args, check=True, capture_output=True)

    @classmethod
    def tearDownClass(cls):
        cls.temporary.cleanup()

    def test_valid_chain_and_both_hostnames(self):
        deploy.validate_certificate(self.root / 'valid.pem', self.key, self.ca)

    def test_untrusted_certificate_rejected(self):
        with self.assertRaises(subprocess.CalledProcessError):
            deploy.validate_certificate(self.root / 'valid.pem', self.key)

    def test_wrong_hostname_rejected(self):
        with self.assertRaises(subprocess.CalledProcessError):
            deploy.validate_certificate(self.root / 'wrong-host.pem', self.key, self.ca)

    def test_short_lifetime_rejected(self):
        with self.assertRaises(subprocess.CalledProcessError):
            deploy.validate_certificate(self.root / 'expires-soon.pem', self.key, self.ca)

    def test_wrong_key_rejected(self):
        with self.assertRaises(ValueError):
            deploy.validate_certificate(self.root / 'valid.pem', self.ca_key, self.ca)

    def test_reload_failure_restores_original_pair(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'installed'
            target.mkdir()
            (target / 'fullchain.pem').write_bytes(b'original certificate')
            (target / 'privkey.pem').write_bytes(b'original key')
            calls = []

            def reload_failure(*args):
                calls.append(args)
                if args == ('/usr/bin/systemctl', 'reload', 'nginx') and calls.count(args) == 1:
                    raise subprocess.CalledProcessError(1, args)
                return b''

            with patch.object(deploy, 'TARGET', target), patch.object(deploy, 'validate_certificate'), patch.object(deploy, 'run', reload_failure):
                with self.assertRaises(subprocess.CalledProcessError):
                    deploy.deploy(self.root / 'valid.pem', self.key)
            self.assertEqual((target / 'fullchain.pem').read_bytes(), b'original certificate')
            self.assertEqual((target / 'privkey.pem').read_bytes(), b'original key')
            self.assertEqual(calls.count(('/usr/bin/systemctl', 'reload', 'nginx')), 2)


if __name__ == '__main__':
    unittest.main()
