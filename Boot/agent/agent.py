
import os
import time
import logging
from datetime import datetime, timezone

import requests
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', 'server', '.env'))

SERVER_URL        = os.getenv('SERVER_URL',        'http://localhost:3001')
MONGO_URI         = os.getenv('MONGO_URI',         'mongodb://localhost:27017')
DB_NAME           = os.getenv('DB_NAME',           'marsa_scan')
DELAI_MAX_MIN     = int(os.getenv('DELAI_MAX_MIN', '2'))
POLL_INTERVAL_SEC = int(os.getenv('POLL_INTERVAL_SEC', '60'))
REPLY_TIMEOUT_SEC = int(os.getenv('REPLY_TIMEOUT_SEC', '600'))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)
log = logging.getLogger('agent')

alertes_envoyees: dict = {}


# ── Helpers ────────────────────────────────────────────────────────────────────

def normaliser_numero(numero: str) -> str:
    """Retire les non-chiffres, remplace 0 initial par 212."""
    n = ''.join(c for c in str(numero) if c.isdigit())
    if n.startswith('0'):
        n = '212' + n[1:]
    return n


def send_whatsapp(message: str, numero: str) -> bool:
    try:
        r = requests.post(
            f'{SERVER_URL}/api/whatsapp/send',
            json={'message': message, 'number': numero},
            timeout=15,
        )
        if r.ok:
            log.info('WhatsApp envoyé à %s', numero)
            return True
        log.error('Erreur envoi WhatsApp (%s): %s', r.status_code, r.text)
    except Exception as exc:
        log.error('Exception envoi WhatsApp: %s', exc)
    return False


def poll_reponse(chef_numero: str, since_ms: int) -> str | None:
    """Attend la réponse du chef. Retourne le texte ou None si timeout."""
    chef_id = normaliser_numero(chef_numero) + '@c.us'
    deadline = time.time() + REPLY_TIMEOUT_SEC
    log.info('Attente réponse de %s (max %ds)…', chef_id, REPLY_TIMEOUT_SEC)

    current_since = since_ms
    while time.time() < deadline:
        time.sleep(10)
        try:
            r = requests.get(
                f'{SERVER_URL}/api/whatsapp/inbox',
                params={'since': current_since},
                timeout=10,
            )
            if r.ok:
                messages = r.json()
                if messages:
                    log.info('Inbox: %d message(s) reçu(s)', len(messages))
                    for msg in messages:
                        log.info('  from=%s | body=%s', msg.get('from'), msg.get('body'))
                        msg_from = msg.get('from', '')
                        # Ignore group messages (@g.us) and status broadcasts
                        if '@g.us' in msg_from or 'status' in msg_from.lower():
                            continue
                        # Accept any direct message (@c.us or @lid — WhatsApp new LID format)
                        if '@c.us' in msg_from or '@lid' in msg_from:
                            log.info('Réponse du chef identifiée : %s', msg['body'])
                            return msg['body']
                    # Advance since_ms past the latest message to avoid re-reading
                    latest_ts = max(m.get('timestamp', current_since) for m in messages)
                    current_since = latest_ts + 1
        except Exception as exc:
            log.warning('Erreur poll inbox: %s', exc)

    log.warning('Timeout – pas de réponse du chef')
    return None


def enregistrer_arret(team_name: str, stopped_at: datetime, reason: str, chef_numero: str):
    try:
        r = requests.post(
            f'{SERVER_URL}/api/stops',
            json={
                'team':        team_name,
                'stopped_at':  stopped_at.isoformat(),
                'reason':      reason,
                'chef_number': chef_numero,
            },
            timeout=10,
        )
        if r.ok:
            log.info('Arrêt enregistré → équipe: %s | raison: %s', team_name, reason)
        else:
            log.error('Erreur enregistrement: %s', r.text)
    except Exception as exc:
        log.error('Exception enregistrement: %s', exc)


# ── Logique principale ─────────────────────────────────────────────────────────

def charger_equipes(db) -> list:
    """
    Charge toutes les équipes depuis la collection teams.
    Retourne une liste de dicts :
      { name, leader_name, leader_phone, camera_ids }
    """
    equipes = []
    for doc in db['teams'].find({}):
        phone = doc.get('leader_phone')
        if not phone:
            log.warning(
                'Équipe "%s" – leader_phone manquant, elle sera ignorée.',
                doc.get('name', doc['_id']),
            )
            continue
        equipes.append({
            'name':         doc.get('name', str(doc['_id'])),
            'leader_name':  doc.get('leader_name', ''),
            'leader_phone': str(phone),
            'camera_ids':   [str(c) for c in doc.get('camera_ids', [])],
        })
    return equipes


def dernier_scan_equipe(db, camera_ids: list) -> datetime | None:
    """Retourne la date du dernier scan parmi toutes les caméras de l'équipe."""
    if not camera_ids:
        # Si pas de caméras définies, prend le dernier scan global
        doc = db['scans'].find_one({}, sort=[('created_at', -1)])
    else:
        # Cherche dans les scans dont camera_id est dans la liste
        from bson import ObjectId
        ids_bson = []
        for cid in camera_ids:
            try:
                ids_bson.append(ObjectId(cid))
            except Exception:
                ids_bson.append(cid)
        doc = db['scans'].find_one(
            {'camera_id': {'$in': ids_bson}},
            sort=[('created_at', -1)],
        )
        # Fallback : si camera_id n'existe pas dans scans, prend le dernier scan global
        if doc is None:
            doc = db['scans'].find_one({}, sort=[('created_at', -1)])

    if doc:
        ts = doc.get('created_at')
        if ts and ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        return ts
    return None


def traiter_arret(equipe: dict, dernier_scan: datetime):
    """Envoie l'alerte au chef et attend sa réponse."""
    maintenant = time.time()
    team_name  = equipe['name']

    # Anti-spam : une alerte par équipe par période REPLY_TIMEOUT_SEC
    if maintenant - alertes_envoyees.get(team_name, 0) < REPLY_TIMEOUT_SEC:
        return

    alertes_envoyees[team_name] = maintenant
    since_ms   = int(maintenant * 1000)
    heure_arret = dernier_scan.astimezone().strftime('%H:%M')
    chef_nom   = equipe['leader_name']
    chef_phone = normaliser_numero(equipe['leader_phone'])

    message = (
        f"🔴 *MARSA MAROC – Alerte Arrêt*\n"
        f"Bonjour *{chef_nom}*,\n\n"
        f"Équipe : *{team_name}*\n"
        f"Dernier scan détecté à *{heure_arret}*.\n"
        f"Aucune activité depuis plus de *{DELAI_MAX_MIN} min*.\n\n"
        f"Quel est le motif de cet arrêt ?"
    )

    log.info('Alerte → %s (%s) | chef: %s (%s)', team_name, heure_arret, chef_nom, chef_phone)

    if not send_whatsapp(message, chef_phone):
        log.error('Envoi WhatsApp échoué – vérifiez que WhatsApp est connecté.')
        return

    raison = poll_reponse(chef_phone, since_ms)
    enregistrer_arret(
        team_name,
        dernier_scan,
        raison if raison else 'Pas de réponse du chef',
        chef_phone,
    )


def verifier_arrets(db):
    maintenant = datetime.now(timezone.utc)
    equipes    = charger_equipes(db)

    if not equipes:
        log.warning('Aucune équipe avec leader_phone trouvée dans la collection teams.')
        return

    for equipe in equipes:
        dernier = dernier_scan_equipe(db, equipe['camera_ids'])

        if dernier is None:
            log.info('Équipe %s – aucun scan en base.', equipe['name'])
            continue

        delai_min = (maintenant - dernier).total_seconds() / 60

        if delai_min > DELAI_MAX_MIN:
            log.warning(
                'ARRÊT – équipe: %s | dernier scan il y a %.1f min | chef: %s',
                equipe['name'], delai_min, equipe['leader_name'],
            )
            traiter_arret(equipe, dernier)
        else:
            log.info(
                'OK – équipe: %-12s | dernier scan il y a %.1f min',
                equipe['name'], delai_min,
            )


# ── Entry point ────────────────────────────────────────────────────────────────

def main():
    log.info('=' * 55)
    log.info('Agent MARSA MAROC démarré')
    log.info('Délai max : %d min | Poll : %ds', DELAI_MAX_MIN, POLL_INTERVAL_SEC)
    log.info('Serveur   : %s', SERVER_URL)
    log.info('=' * 55)

    mongo = MongoClient(MONGO_URI)
    db    = mongo[DB_NAME]
    log.info('Connecté à MongoDB → %s', DB_NAME)

    while True:
        try:
            verifier_arrets(db)
        except Exception as exc:
            log.error('Erreur boucle principale: %s', exc)
        time.sleep(POLL_INTERVAL_SEC)


if __name__ == '__main__':
    main()
